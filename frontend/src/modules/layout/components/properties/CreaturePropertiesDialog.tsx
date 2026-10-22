import { useState, type PointerEventHandler, type Ref } from "react";
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
  CREATURE_METAMAGIC_FILTER_OPTIONS,
  CREATURE_MOVEMENT_RATE_OPTIONS,
  CREATURE_PROPERTIES_TAB_OPTIONS,
  CREATURE_RACE_OPTIONS,
  CREATURE_SCRIPT_SLOT_KEYS,
  CREATURE_SCRIPT_SLOT_LABELS,
  CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS,
  CREATURE_SPELL_LEVEL_FILTER_OPTIONS,
  type CreaturePropertiesDialogState,
  type CreaturePropertiesDraft,
  type CreaturePropertiesTab,
  type CreatureScriptSlotKey
} from "../../application/workspaceObjectPropertyDrafts";
import {
  formatItemEquipSlotMask,
  formatItemEquipmentSlotMask,
  parseItemEquipSlotMask
} from "../../../items/application/itemEquipSlots";
import type { CreatureApiResourceOption } from "../../../creatures/contracts";
import {
  canEditExistingCreatureAppearance,
  isExistingCreatureAppearanceCatalogAdmitted,
  type ExistingCreatureAppearanceCatalog,
} from "../../application/creatureAppearanceProvenance";
import {
  canEditExistingCreatureGender,
  isExistingCreatureGenderCatalogAdmitted,
  type ExistingCreatureGenderCatalog,
} from "../../application/creatureGenderProvenance";
import {
  isExistingCreatureAppendageCatalogAdmitted,
  readExistingCreatureAppendageProvenance,
  type ExistingCreatureAppendageCatalog,
} from "../../application/creatureAppendageProvenance";
import {
  isExistingCreaturePerceptionRangeCatalogAdmitted,
  readExistingCreaturePerceptionRangeProvenance,
  type ExistingCreaturePerceptionRangeCatalog,
} from "../../application/creaturePerceptionRangeProvenance";
import {
  isExistingCreatureWalkRateCatalogAdmitted,
  readExistingCreatureWalkRateProvenance,
  type ExistingCreatureWalkRateCatalog,
} from "../../application/creatureWalkRateProvenance";
import {
  isExistingCreatureSoundSetCatalogAdmitted,
  readExistingCreatureSoundSetProvenance,
  type ExistingCreatureSoundSetCatalog,
} from "../../application/creatureSoundSetProvenance";
import {
  isExistingCreatureStartingPackageCatalogAdmitted,
  readExistingCreatureStartingPackageProvenance,
  resolveCreatureStartingPackageDisplayName,
  type ExistingCreatureStartingPackageCatalog,
} from "../../application/creatureStartingPackageProvenance";
import {
  isExistingCreatureSkillCatalogAdmitted,
  readExistingCreatureSkillListProvenance,
  type ExistingCreatureSkillCatalog,
} from "../../application/creatureSkillListProvenance";
import {
  isExistingCreatureFeatCatalogAdmitted,
  materializeExistingCreatureFeats,
  readExistingCreatureFeatListProvenance,
  type ExistingCreatureFeatCatalog,
} from "../../application/creatureFeatListProvenance";
import {
  isExistingCreatureSpecialAbilityCatalogAdmitted,
  materializeExistingCreatureSpecialAbilities,
  readExistingCreatureSpecialAbilityListProvenance,
  type ExistingCreatureSpecialAbilityCatalog,
} from "../../application/creatureSpecialAbilityListProvenance";
import {
  isExistingCreaturePhenotypeCatalogAdmitted,
  readExistingCreaturePhenotypeProvenance,
  type ExistingCreaturePhenotypeCatalog,
} from "../../application/creaturePhenotypeProvenance";
import { canEditExistingCreatureChallengeRating } from "../../application/creatureChallengeRatingProvenance";
import { canEditExistingCreatureAbilityScore } from "../../application/creatureAbilityScoresProvenance";
import {
  canEditExistingCreatureHitPoints,
  readExistingCreatureHitPointState,
} from "../../application/creatureHitPointsProvenance";
import { canEditExistingCreatureClassLevels } from
  "../../application/creatureClassLevelProvenance";
import {
  isExistingCreatureClassCatalogAdmitted,
  isExistingCreatureClassIdentityPackageCatalogAdmitted,
  readExistingCreatureClassIdentityProvenance,
  type ExistingCreatureClassCatalog,
} from "../../application/creatureClassIdentityProvenance";
import { readExistingCreatureClassSpellClearProvenance } from
  "../../application/creatureClassSpellClearProvenance";
import {
  readExistingCreatureClassSpellRemovalProvenance,
  type CreatureClassSpellRemovalTarget,
} from "../../application/creatureClassSpellRemovalProvenance";
import {
  readExistingCreatureClassSpellReorderProvenance,
  type CreatureClassSpellReorder,
  type ExistingCreatureClassSpellReorderList,
} from "../../application/creatureClassSpellReorderProvenance";
import type { CreatureAbilityScoreKey } from "../../../scene/domain/creatureAbilityScores";
import type { CreatureAppearanceColorKey } from "../../../scene/domain/creatureAppearanceColors";
import { canEditExistingCreatureAppearanceColor } from
  "../../application/creatureAppearanceColorsProvenance";
import type { CreatureBodyPartKey } from "../../../scene/domain/creatureBodyParts";
import {
  canEditExistingCreatureBodyPart,
  maximumExistingCreatureBodyPartTarget,
} from "../../application/creatureBodyPartProvenance";
import { calculateCreatureHitPoints } from "../../../scene/domain/creatureHitPoints";
import { canEditExistingCreatureNaturalArmorClass } from "../../application/creatureNaturalArmorClassProvenance";
import { canEditExistingCreatureSavingThrowBonus } from "../../application/creatureSavingThrowBonusesProvenance";
import type { CreatureSavingThrowBonusKey } from "../../../scene/domain/creatureSavingThrowBonuses";
import { canEditExistingCreatureAlignment } from "../../application/creatureAlignmentProvenance";
import { canEditExistingCreatureFaction } from "../../application/creatureFactionProvenance";
import { canEditExistingCreatureTemplateResRef } from "../../application/creatureTemplateResRefProvenance";
import { canEditExistingCreatureSpecialIdentityString } from "../../application/creatureSpecialIdentityStringsProvenance";
import { canEditExistingCreatureScriptResRef } from "../../application/creatureScriptResRefsProvenance";
import { canEditExistingCreatureVariables } from "../../application/creatureVariableProvenance";
import { canEditExistingCreatureEditorComment } from "../../application/creatureEditorCommentProvenance";
import { CREATURE_EDITOR_COMMENT_MAX_CODE_UNITS } from "../../../scene/domain/creatureEditorComment";
import { MAX_CREATURE_TAG_CODE_UNITS } from "../../application/creatureTagProvenance";
import { MAX_CREATURE_CONVERSATION_RESREF_BYTES } from "../../application/creatureConversationProvenance";

import {
  MAX_CREATURE_FIRST_NAME_ASCII_BYTES,
  MAX_CREATURE_LAST_NAME_ASCII_BYTES,
  MAX_CREATURE_DESCRIPTION_ASCII_BYTES,
  MAX_CREATURE_LOCALIZED_STRING_ENTRIES,
  MAX_CREATURE_LOCALIZED_STRING_ENTRY_BYTES,
  MAX_CREATURE_LOCALIZED_STRING_TOTAL_TEXT_BYTES,
  isCreatureNameInlineAsciiText,
} from "../../../scene/domain/creatureNameLocalizedStrings";
import type {
  SceneObjectEditableLocalizedStringEntry,
  SceneCreaturePortraitCatalog,
  ScenePlaceableBodyBagCatalog,
  ScenePlaceableFactionCatalog,
} from "../../../scene/contracts";
import { admittedCreaturePortraitRows } from "../../../scene/domain/creaturePortrait";
import { readExistingCreaturePortraitProvenance } from
  "../../application/creaturePortraitProvenance";
import {
  CREATURE_DECAY_MAX_SECONDS,
  CREATURE_DECAY_MIN_SECONDS,
  canEditExistingCreatureBodyBag,
  canEditExistingCreatureDecayTime,
  creatureDecaySecondsToMilliseconds,
} from "../../../scene/domain/creatureDeathRemains";
import { CREATURE_TEMPLATE_RESREF_MAX_CODE_UNITS } from "../../../scene/domain/creatureTemplateResRef";
import { CREATURE_SPECIAL_IDENTITY_STRING_MAX_CODE_UNITS } from "../../../scene/domain/creatureSpecialIdentityStrings";
import { LocalizedStringEntryEditor } from "./LocalizedStringEntryEditor";

function classSpellRemovalTargetOrder(target: CreatureClassSpellRemovalTarget): number {
  return target.classSlotIndex * 28 * 256 + (target.listKind === "known" ? 0 : 14) * 256 +
    target.spellLevel * 256 + target.entryIndex;
}

function compareClassSpellRemovalTargets(
  left: CreatureClassSpellRemovalTarget,
  right: CreatureClassSpellRemovalTarget,
): number {
  return classSpellRemovalTargetOrder(left) - classSpellRemovalTargetOrder(right);
}

function classSpellRemovalTargetKey(target: CreatureClassSpellRemovalTarget): string {
  return `${target.classSlotIndex}:${target.listKind}:${target.spellLevel}:${target.entryIndex}`;
}

function classSpellReorderKey(
  value: Pick<CreatureClassSpellReorder, "classSlotIndex" | "listKind" | "spellLevel">,
): string {
  return `${value.classSlotIndex}:${value.listKind}:${value.spellLevel}`;
}

function classSpellReorderOrder(
  value: Pick<CreatureClassSpellReorder, "classSlotIndex" | "listKind" | "spellLevel">,
): number {
  return value.classSlotIndex * 28 + (value.listKind === "known" ? 0 : 14) + value.spellLevel;
}

function stageCreatureClassSpellEntryMove(
  current: readonly CreatureClassSpellReorder[],
  list: ExistingCreatureClassSpellReorderList,
  displayIndex: number,
  direction: "up" | "down",
): CreatureClassSpellReorder[] {
  const key = classSpellReorderKey(list);
  const existing = current.find((candidate) => classSpellReorderKey(candidate) === key);
  const entryOrder = existing
    ? [...existing.entryOrder]
    : list.entries.map((_entry, index) => index);
  const otherIndex = direction === "up" ? displayIndex - 1 : displayIndex + 1;
  if (displayIndex < 0 || displayIndex >= entryOrder.length ||
    otherIndex < 0 || otherIndex >= entryOrder.length) return current.map((entry) => ({
      ...entry,
      entryOrder: [...entry.entryOrder],
    }));
  [entryOrder[displayIndex], entryOrder[otherIndex]] =
    [entryOrder[otherIndex]!, entryOrder[displayIndex]!];
  const identity = entryOrder.every((sourceIndex, index) => sourceIndex === index);
  const next = current.filter((candidate) => classSpellReorderKey(candidate) !== key)
    .map((candidate) => ({ ...candidate, entryOrder: [...candidate.entryOrder] }));
  if (!identity) next.push({
    classSlotIndex: list.classSlotIndex,
    listKind: list.listKind,
    spellLevel: list.spellLevel,
    entryOrder,
  });
  return next.sort((left, right) => classSpellReorderOrder(left) - classSpellReorderOrder(right));
}

type CreatureVariableDraft = CreaturePropertiesDraft["variables"][number];
type CreatureResourceOptions = Partial<
  Record<"conversation" | "portrait" | "script" | "soundset", CreatureApiResourceOption[]>
>;

interface CreaturePropertiesDialogProps {
  creaturePropertiesDialog: CreaturePropertiesDialogState;
  creatureBodyBagCatalog?: ScenePlaceableBodyBagCatalog | null;
  creatureFactionCatalog?: ScenePlaceableFactionCatalog | null;
  creatureAppearanceCatalog?: ExistingCreatureAppearanceCatalog | null;
  creatureAppearanceCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creatureAppearanceCatalogError?: string | null;
  onCreatureAppearanceSearch?: (query: string) => void;
  creatureGenderCatalog?: ExistingCreatureGenderCatalog | null;
  creatureGenderCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creatureGenderCatalogError?: string | null;
  onCreatureGenderSearch?: (query: string) => void;
  creatureWingsCatalog?: ExistingCreatureAppendageCatalog | null;
  creatureWingsCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creatureWingsCatalogError?: string | null;
  onCreatureWingsSearch?: (query: string) => void;
  creatureTailCatalog?: ExistingCreatureAppendageCatalog | null;
  creatureTailCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creatureTailCatalogError?: string | null;
  onCreatureTailSearch?: (query: string) => void;
  creaturePerceptionRangeCatalog?: ExistingCreaturePerceptionRangeCatalog | null;
  creaturePerceptionRangeCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creaturePerceptionRangeCatalogError?: string | null;
  onCreaturePerceptionRangeSearch?: (query: string) => void;
  creatureWalkRateCatalog?: ExistingCreatureWalkRateCatalog | null;
  creatureWalkRateCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creatureWalkRateCatalogError?: string | null;
  onCreatureWalkRateSearch?: (query: string) => void;
  creatureSoundSetCatalog?: ExistingCreatureSoundSetCatalog | null;
  creatureSoundSetCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creatureSoundSetCatalogError?: string | null;
  onCreatureSoundSetSearch?: (query: string) => void;
  creatureStartingPackageCatalog?: ExistingCreatureStartingPackageCatalog | null;
  creatureStartingPackageCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creatureStartingPackageCatalogError?: string | null;
  onCreatureStartingPackageSearch?: (query: string) => void;
  creatureClassCatalog?: ExistingCreatureClassCatalog | null;
  creatureClassCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creatureClassCatalogError?: string | null;
  onCreatureClassSearch?: (query: string) => void;
  creatureSkillCatalog?: ExistingCreatureSkillCatalog | null;
  creatureSkillCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creatureSkillCatalogError?: string | null;
  creatureFeatCatalog?: ExistingCreatureFeatCatalog | null;
  creatureFeatCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creatureFeatCatalogError?: string | null;
  creatureSpecialAbilityCatalog?: ExistingCreatureSpecialAbilityCatalog | null;
  creatureSpecialAbilityCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creatureSpecialAbilityCatalogError?: string | null;
  creaturePhenotypeCatalog?: ExistingCreaturePhenotypeCatalog | null;
  creaturePhenotypeCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  creaturePhenotypeCatalogError?: string | null;
  onCreaturePhenotypeSearch?: (query: string) => void;
  creaturePortraitCatalog?: SceneCreaturePortraitCatalog | null;
  creaturePropertiesDialogRef?: Ref<HTMLElement>;
  toggleCreaturePropertiesDialogCollapsed: () => void;
  cancelCreaturePropertiesDialog: () => void;
  setCreaturePropertiesActiveTab: (nextTab: CreaturePropertiesTab) => void;
  updateCreaturePropertiesDraftField: (
    field: keyof CreaturePropertiesDraft,
    value: string | number | boolean | readonly number[] |
      readonly CreatureClassSpellRemovalTarget[] |
      readonly CreatureClassSpellReorder[] |
      readonly SceneObjectEditableLocalizedStringEntry[]
  ) => void;
  updateCreatureClassEntry: (
    index: number,
    field: "classId" | "className" | "level",
    value: string | number
  ) => void;
  appendCreatureClassSlot: () => void;
  truncateCreatureClassSlot: () => void;
  updateCreatureSkillRank: (index: number, rank: number) => void;
  updateCreatureFeatAssigned: (featId: number, assigned: boolean) => void;
  updateCreatureSpecialAbility: (
    spellId: number,
    field: "uses" | "casterLevel",
    value: number,
  ) => void;
  updateCreatureScriptSlot: (field: CreatureScriptSlotKey, value: string) => void;
  updateCreatureAppearancePart: (
    field: keyof CreaturePropertiesDraft["appearanceParts"],
    value: string
  ) => void;
  updateCreatureAppearanceSourceOnlyPart?: (
    field: keyof CreaturePropertiesDraft["appearanceSourceOnlyParts"],
    value: string,
  ) => void;
  updateCreatureAppearanceColor: (
    field: CreatureAppearanceColorKey,
    value: string
  ) => void;
  updateCreatureAdvancedField: (
    field: keyof CreaturePropertiesDraft["advancedSettings"],
    value: string | number | boolean
  ) => void;
  addCreatureVariable: () => void;
  updateCreatureVariable: (index: number, entry: CreatureVariableDraft) => void;
  moveCreatureVariable: (index: number, direction: "up" | "down") => void;
  removeCreatureVariable: (index: number) => void;
  addCreatureInventoryItem: () => void;
  updateCreatureInventoryItem: (
    index: number,
    field: "x" | "y" | "dropable" | "pickpocketable",
    value: number | boolean
  ) => void;
  moveCreatureInventoryItem: (index: number, direction: "up" | "down") => void;
  removeCreatureInventoryItem: (index: number) => void;
  updateCreatureEquipmentItem: (
    index: number,
    field: "dropable" | "pickpocketable",
    value: boolean
  ) => void;
  removeCreatureEquipmentItem: (index: number) => void;
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

export function CreaturePropertiesDialog({
  creaturePropertiesDialog,
  creatureBodyBagCatalog = null,
  creatureFactionCatalog = null,
  creatureAppearanceCatalog = null,
  creatureAppearanceCatalogStatus = "unavailable",
  creatureAppearanceCatalogError = null,
  onCreatureAppearanceSearch,
  creatureGenderCatalog = null,
  creatureGenderCatalogStatus = "unavailable",
  creatureGenderCatalogError = null,
  onCreatureGenderSearch,
  creatureWingsCatalog = null,
  creatureWingsCatalogStatus = "unavailable",
  creatureWingsCatalogError = null,
  onCreatureWingsSearch,
  creatureTailCatalog = null,
  creatureTailCatalogStatus = "unavailable",
  creatureTailCatalogError = null,
  onCreatureTailSearch,
  creaturePerceptionRangeCatalog = null,
  creaturePerceptionRangeCatalogStatus = "unavailable",
  creaturePerceptionRangeCatalogError = null,
  onCreaturePerceptionRangeSearch,
  creatureWalkRateCatalog = null,
  creatureWalkRateCatalogStatus = "unavailable",
  creatureWalkRateCatalogError = null,
  onCreatureWalkRateSearch,
  creatureSoundSetCatalog = null,
  creatureSoundSetCatalogStatus = "unavailable",
  creatureSoundSetCatalogError = null,
  onCreatureSoundSetSearch,
  creatureStartingPackageCatalog = null,
  creatureStartingPackageCatalogStatus = "unavailable",
  creatureStartingPackageCatalogError = null,
  onCreatureStartingPackageSearch,
  creatureClassCatalog = null,
  creatureClassCatalogStatus = "unavailable",
  creatureClassCatalogError = null,
  onCreatureClassSearch,
  creatureSkillCatalog = null,
  creatureSkillCatalogStatus = "unavailable",
  creatureSkillCatalogError = null,
  creatureFeatCatalog = null,
  creatureFeatCatalogStatus = "unavailable",
  creatureFeatCatalogError = null,
  creatureSpecialAbilityCatalog = null,
  creatureSpecialAbilityCatalogStatus = "unavailable",
  creatureSpecialAbilityCatalogError = null,
  creaturePhenotypeCatalog = null,
  creaturePhenotypeCatalogStatus = "unavailable",
  creaturePhenotypeCatalogError = null,
  onCreaturePhenotypeSearch,
  creaturePortraitCatalog = null,
  creaturePropertiesDialogRef,
  toggleCreaturePropertiesDialogCollapsed,
  cancelCreaturePropertiesDialog,
  setCreaturePropertiesActiveTab,
  updateCreaturePropertiesDraftField,
  updateCreatureClassEntry,
  appendCreatureClassSlot,
  truncateCreatureClassSlot,
  updateCreatureSkillRank,
  updateCreatureFeatAssigned,
  updateCreatureSpecialAbility,
  updateCreatureScriptSlot,
  updateCreatureAppearancePart,
  updateCreatureAppearanceSourceOnlyPart,
  updateCreatureAppearanceColor,
  updateCreatureAdvancedField,
  addCreatureVariable,
  updateCreatureVariable,
  moveCreatureVariable,
  removeCreatureVariable,
  addCreatureInventoryItem,
  updateCreatureInventoryItem,
  moveCreatureInventoryItem,
  removeCreatureInventoryItem,
  updateCreatureEquipmentItem,
  removeCreatureEquipmentItem,
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
  const [appearanceQuery, setAppearanceQuery] = useState(
    creatureAppearanceCatalog?.query ?? "",
  );
  const [genderQuery, setGenderQuery] = useState(
    creatureGenderCatalog?.query ?? "",
  );
  const [wingsQuery, setWingsQuery] = useState(creatureWingsCatalog?.query ?? "");
  const [tailQuery, setTailQuery] = useState(creatureTailCatalog?.query ?? "");
  const [perceptionRangeQuery, setPerceptionRangeQuery] = useState(
    creaturePerceptionRangeCatalog?.query ?? "",
  );
  const [walkRateQuery, setWalkRateQuery] = useState(
    creatureWalkRateCatalog?.query ?? "",
  );
  const [soundSetQuery, setSoundSetQuery] = useState(
    creatureSoundSetCatalog?.query ?? "",
  );
  const [startingPackageQuery, setStartingPackageQuery] = useState(
    creatureStartingPackageCatalog?.query ?? "",
  );
  const [classQuery, setClassQuery] = useState(creatureClassCatalog?.query ?? "");
  const [phenotypeQuery, setPhenotypeQuery] = useState(
    creaturePhenotypeCatalog?.query ?? "",
  );
  const [activeResourcePicker, setActiveResourcePicker] = useState<
    "conversation" | "portrait" | "soundset" | "startingpackage" | null
  >(null);
  const creatureInventoryEditable =
    creaturePropertiesDialog.draft.inventoryControlState === "ACTIVE_NOW";
  const creatureEquipmentEditable =
    creaturePropertiesDialog.draft.equippedItemsControlState === "ACTIVE_NOW";
  const creatureConversationEditable =
    creaturePropertiesDialog.draft.conversationControlState === "ACTIVE_NOW";
  const creatureInterruptableEditable =
    creaturePropertiesDialog.draft.noInterruptControlState === "ACTIVE_NOW";
  const creatureDisarmableEditable =
    creaturePropertiesDialog.draft.disarmableControlState === "ACTIVE_NOW";
  const creaturePlotEditable =
    creaturePropertiesDialog.draft.plotControlState === "ACTIVE_NOW";
  const creatureImmortalEditable =
    creaturePropertiesDialog.draft.immortalControlState === "ACTIVE_NOW";
  const creatureLootableEditable =
    creaturePropertiesDialog.draft.lootableControlState === "ACTIVE_NOW";
  const creatureNoPermanentDeathEditable =
    creaturePropertiesDialog.draft.noPermanentDeathControlState === "ACTIVE_NOW";
  const creatureAppearanceColorEditable = (key: CreatureAppearanceColorKey): boolean =>
    creaturePropertiesDialog.snapshotObject.source?.type !== "aurora_git" ||
    canEditExistingCreatureAppearanceColor(creaturePropertiesDialog.snapshotObject.source, key);
  const creatureAppearancePartEditable = (
    key: keyof CreaturePropertiesDraft["appearanceParts"],
  ): boolean => creaturePropertiesDialog.snapshotObject.source?.type !== "aurora_git" ||
    key !== "wings" && key !== "tail" &&
    canEditExistingCreatureBodyPart(
      creaturePropertiesDialog.snapshotObject.source,
      key as CreatureBodyPartKey,
    );
  const creatureAppendageCatalogFor = (kind: "wings" | "tail") =>
    kind === "wings" ? creatureWingsCatalog : creatureTailCatalog;
  const creatureAppendageCatalogStatusFor = (kind: "wings" | "tail") =>
    kind === "wings" ? creatureWingsCatalogStatus : creatureTailCatalogStatus;
  const hasEditableCreatureAppendageProvenance = (kind: "wings" | "tail") =>
    readExistingCreatureAppendageProvenance(
      creaturePropertiesDialog.snapshotObject.source,
      kind,
    ) !== null;
  const creatureAppendageEditable = (kind: "wings" | "tail"): boolean =>
    creaturePropertiesDialog.snapshotObject.source?.type !== "aurora_git" ||
    creatureAppendageCatalogStatusFor(kind) === "ready" &&
    isExistingCreatureAppendageCatalogAdmitted(
      creaturePropertiesDialog.snapshotObject.source,
      kind,
      creatureAppendageCatalogFor(kind),
    );
  const creatureSourceOnlyPartEditable = (
    key: keyof CreaturePropertiesDraft["appearanceSourceOnlyParts"],
  ): boolean => key !== "robe" &&
    (creaturePropertiesDialog.snapshotObject.source?.type !== "aurora_git" ||
      canEditExistingCreatureBodyPart(
        creaturePropertiesDialog.snapshotObject.source,
        key as CreatureBodyPartKey,
      ));
  const creatureBodyPartMaximum = (key: CreatureBodyPartKey): number =>
    maximumExistingCreatureBodyPartTarget(
      creaturePropertiesDialog.snapshotObject.source,
      key,
    ) ?? 0xffff;
  const currentLootable =
    creaturePropertiesDialog.draft.advancedSettings.leavesLootableCorpse;
  const currentTreasureModelRow =
    creaturePropertiesDialog.draft.advancedSettings.treasureModelRow;
  const creatureBodyBagEditable = canEditExistingCreatureBodyBag(
    creaturePropertiesDialog.snapshotObject.source,
    creatureBodyBagCatalog,
    currentLootable,
  ) && currentTreasureModelRow !== undefined &&
    creatureBodyBagCatalog?.rows[currentTreasureModelRow]?.rowIndex === currentTreasureModelRow;
  const creatureDecayTimeEditable = canEditExistingCreatureDecayTime(
    creaturePropertiesDialog.snapshotObject.source,
    currentLootable,
  ) && creatureDecaySecondsToMilliseconds(
    creaturePropertiesDialog.draft.advancedSettings.corpseDecayTimeSeconds,
  ) !== undefined;
  const currentFactionId = creaturePropertiesDialog.draft.advancedSettings.factionId;
  const creatureFactionEditable =
    creaturePropertiesDialog.draft.factionControlState === "ACTIVE_NOW" &&
    canEditExistingCreatureFaction(
      creaturePropertiesDialog.snapshotObject.source,
      creatureFactionCatalog,
    ) &&
    typeof currentFactionId === "number" &&
    creatureFactionCatalog?.rows.some((row) => row.factionId === currentFactionId) === true;
  const creatureTemplateResRefEditable =
    creaturePropertiesDialog.draft.templateResRefControlState === "ACTIVE_NOW" &&
    canEditExistingCreatureTemplateResRef(creaturePropertiesDialog.snapshotObject.source);
  const creatureSubraceEditable =
    creaturePropertiesDialog.draft.subraceControlState === "ACTIVE_NOW" &&
    canEditExistingCreatureSpecialIdentityString(
      creaturePropertiesDialog.snapshotObject.source,
      "subrace",
    );
  const creatureDeityEditable =
    creaturePropertiesDialog.draft.deityControlState === "ACTIVE_NOW" &&
    canEditExistingCreatureSpecialIdentityString(
      creaturePropertiesDialog.snapshotObject.source,
      "deity",
    );
  const isCreatureScriptSlotEditable = (slot: CreatureScriptSlotKey) =>
    canEditExistingCreatureScriptResRef(
      creaturePropertiesDialog.snapshotObject.source,
      slot,
    );
  const hasEditableAppearanceProvenance = canEditExistingCreatureAppearance(
    creaturePropertiesDialog.snapshotObject.source,
  );
  const creatureAppearanceEditable = creatureAppearanceCatalogStatus === "ready" &&
    isExistingCreatureAppearanceCatalogAdmitted(
      creaturePropertiesDialog.snapshotObject.source,
      creatureAppearanceCatalog,
    );
  const hasEditableGenderProvenance = canEditExistingCreatureGender(
    creaturePropertiesDialog.snapshotObject.source,
  );
  const hasEditableChallengeRatingProvenance =
    canEditExistingCreatureChallengeRating(
      creaturePropertiesDialog.snapshotObject.source,
    );
  const naturalArmorClassEditable =
    creaturePropertiesDialog.snapshotObject.source?.type !== "aurora_git" ||
    canEditExistingCreatureNaturalArmorClass(
      creaturePropertiesDialog.snapshotObject.source,
    );
  const isSavingThrowBonusEditable = (key: CreatureSavingThrowBonusKey) =>
    creaturePropertiesDialog.snapshotObject.source?.type !== "aurora_git" ||
    canEditExistingCreatureSavingThrowBonus(
      creaturePropertiesDialog.snapshotObject.source,
      key,
    );
  const creatureAlignmentEditable =
    creaturePropertiesDialog.snapshotObject.source?.type !== "aurora_git" ||
    canEditExistingCreatureAlignment(creaturePropertiesDialog.snapshotObject.source);
  const creatureGenderEditable = creatureGenderCatalogStatus === "ready" &&
    isExistingCreatureGenderCatalogAdmitted(
      creaturePropertiesDialog.snapshotObject.source,
      creatureGenderCatalog,
    );
  const hasEditablePerceptionRangeProvenance =
    readExistingCreaturePerceptionRangeProvenance(
      creaturePropertiesDialog.snapshotObject.source,
    ) !== null;
  const creaturePerceptionRangeEditable =
    creaturePerceptionRangeCatalogStatus === "ready" &&
    isExistingCreaturePerceptionRangeCatalogAdmitted(
      creaturePropertiesDialog.snapshotObject.source,
      creaturePerceptionRangeCatalog,
    );
  const hasEditableWalkRateProvenance = readExistingCreatureWalkRateProvenance(
    creaturePropertiesDialog.snapshotObject.source,
  ) !== null;
  const creatureWalkRateEditable = creatureWalkRateCatalogStatus === "ready" &&
    isExistingCreatureWalkRateCatalogAdmitted(
      creaturePropertiesDialog.snapshotObject.source,
      creatureWalkRateCatalog,
    );
  const hasEditablePhenotypeProvenance = readExistingCreaturePhenotypeProvenance(
    creaturePropertiesDialog.snapshotObject.source,
  ) !== null;
  const creaturePhenotypeEditable = creaturePhenotypeCatalogStatus === "ready" &&
    isExistingCreaturePhenotypeCatalogAdmitted(
      creaturePropertiesDialog.snapshotObject.source,
      creaturePhenotypeCatalog,
    );
  const retainedCreature = creaturePropertiesDialog.snapshotObject.source?.type ===
    "aurora_git" &&
    creaturePropertiesDialog.snapshotObject.source.sourceKind === "creature";
  const creatureVariablesEditable = !retainedCreature || canEditExistingCreatureVariables(
    creaturePropertiesDialog.snapshotObject.source,
  );
  const creatureEditorCommentEditable = !retainedCreature ||
    canEditExistingCreatureEditorComment(creaturePropertiesDialog.snapshotObject.source);
  const hasEditableSoundSetProvenance = readExistingCreatureSoundSetProvenance(
    creaturePropertiesDialog.snapshotObject.source,
  ) !== null;
  const creatureSoundSetEditable = creatureSoundSetCatalogStatus === "ready" &&
    isExistingCreatureSoundSetCatalogAdmitted(
      creaturePropertiesDialog.snapshotObject.source,
      creatureSoundSetCatalog,
    );
  const classIdentityProvenance = readExistingCreatureClassIdentityProvenance(
    creaturePropertiesDialog.snapshotObject.source,
  );
  const classSpellClearProvenance = readExistingCreatureClassSpellClearProvenance(
    creaturePropertiesDialog.snapshotObject.source,
  );
  const classSpellRemovalProvenance = readExistingCreatureClassSpellRemovalProvenance(
    creaturePropertiesDialog.snapshotObject.source,
  );
  const classSpellReorderProvenance = readExistingCreatureClassSpellReorderProvenance(
    creaturePropertiesDialog.snapshotObject.source,
  );
  const targetClassIds = creaturePropertiesDialog.draft.classEntries.flatMap((entry) =>
    Number.isSafeInteger(entry.classId) ? [Number(entry.classId)] : []);
  const creatureClassSlotCountChanged = classIdentityProvenance !== null &&
    creaturePropertiesDialog.draft.classEntries.length !==
      classIdentityProvenance.sourceClassIds.length;
  const creatureClassSlotShrinking = classIdentityProvenance !== null &&
    creaturePropertiesDialog.draft.classEntries.length <
      classIdentityProvenance.sourceClassIds.length;
  const creatureClassIdsChanged = classIdentityProvenance !== null &&
    targetClassIds.length === classIdentityProvenance.sourceClassIds.length &&
    targetClassIds.some((classId, index) =>
      classId !== classIdentityProvenance.sourceClassIds[index]);
  const creatureClassIdentityEditable = creatureClassCatalogStatus === "ready" &&
    isExistingCreatureClassCatalogAdmitted(
      creaturePropertiesDialog.snapshotObject.source,
      creatureClassCatalog,
    );
  const hasEditableStartingPackageProvenance =
    readExistingCreatureStartingPackageProvenance(
      creaturePropertiesDialog.snapshotObject.source,
    ) !== null;
  const creatureStartingPackageEditable = creatureStartingPackageCatalogStatus === "ready" &&
    (creatureClassIdsChanged || creatureClassSlotCountChanged
      ? isExistingCreatureClassIdentityPackageCatalogAdmitted(
          creaturePropertiesDialog.snapshotObject.source,
          targetClassIds,
          creatureStartingPackageCatalog,
        )
      : isExistingCreatureStartingPackageCatalogAdmitted(
          creaturePropertiesDialog.snapshotObject.source,
          creatureStartingPackageCatalog,
        ));
  const creatureClassIdentityApplyReady = !creatureClassIdsChanged || (
    creatureClassIdentityEditable && creatureStartingPackageEditable &&
    creaturePropertiesDialog.draft.classIdentityDestructiveSpellClearConfirmed &&
    creatureStartingPackageCatalog?.items.some((row) =>
      row.rowIndex === creaturePropertiesDialog.draft.advancedSettings.startingPackageId &&
      targetClassIds.includes(row.classId)) === true
  );
  const retainedClassPrefixLength = classIdentityProvenance
    ? Math.min(
        creaturePropertiesDialog.draft.classEntries.length,
        classIdentityProvenance.sourceClassIds.length,
      )
    : 0;
  const creatureClassSlotResizeApplyReady = !creatureClassSlotCountChanged || Boolean(
    classIdentityProvenance && creatureClassIdentityEditable &&
    creatureStartingPackageEditable &&
    canEditExistingCreatureHitPoints(creaturePropertiesDialog.snapshotObject.source) &&
    targetClassIds.length === creaturePropertiesDialog.draft.classEntries.length &&
    new Set(targetClassIds).size === targetClassIds.length &&
    creaturePropertiesDialog.draft.classEntries.length >= 1 &&
    creaturePropertiesDialog.draft.classEntries.length <= 8 &&
    creaturePropertiesDialog.draft.classEntries.every((entry, index) =>
      Number.isSafeInteger(entry.classId) && Number(entry.classId) >= 0 &&
      Number(entry.classId) < classIdentityProvenance.classesRowCount &&
      Number.isSafeInteger(entry.level) && entry.level >= 1 && entry.level <= 60 &&
      (index >= retainedClassPrefixLength ||
        (entry.classId === classIdentityProvenance.sourceClassIds[index] &&
          entry.level === classIdentityProvenance.sourceLevels[index]))) &&
    creaturePropertiesDialog.draft.classEntries.reduce(
      (sum, entry) => sum + entry.level,
      0,
    ) <= 180 &&
    creaturePropertiesDialog.draft.classSlotResizeDestructiveRemovalConfirmed ===
      creatureClassSlotShrinking &&
    !creaturePropertiesDialog.draft.classIdentityDestructiveSpellClearConfirmed &&
    creatureStartingPackageCatalog?.items.some((row) =>
      row.rowIndex === creaturePropertiesDialog.draft.advancedSettings.startingPackageId &&
      targetClassIds.includes(row.classId)) === true,
  );
  const creatureClassApplyReady = creatureClassIdentityApplyReady &&
    creatureClassSlotResizeApplyReady;
  const creatureClassSpellClearEditable = classSpellClearProvenance !== null &&
    creaturePropertiesDialog.draft.classEntries.length ===
      classSpellClearProvenance.sourceClassIds.length &&
    creaturePropertiesDialog.draft.classEntries.every((entry, index) =>
      entry.classId === classSpellClearProvenance.sourceClassIds[index] &&
      entry.level === classSpellClearProvenance.sourceLevels[index]);
  const creatureClassSpellClearSelectedSlotEligible = creatureClassSpellClearEditable &&
    Number.isSafeInteger(creatureSpellsClassFilterIndex) &&
    creatureSpellsClassFilterIndex >= 0 &&
    creatureSpellsClassFilterIndex < classSpellClearProvenance.sourceClassIds.length &&
    classSpellClearProvenance.canonicalSpellListFieldCounts[
      creatureSpellsClassFilterIndex
    ]! > 0;
  const creatureClassSpellClearSelectedSlotStaged =
    creaturePropertiesDialog.draft.classSpellClearSlotIndices.includes(
      creatureSpellsClassFilterIndex,
    );
  const creatureClassSpellRemovalEditable = classSpellRemovalProvenance !== null &&
    creaturePropertiesDialog.draft.classEntries.length ===
      classSpellRemovalProvenance.sourceClassIds.length &&
    creaturePropertiesDialog.draft.classEntries.every((entry, index) =>
      entry.classId === classSpellRemovalProvenance.sourceClassIds[index] &&
      entry.level === classSpellRemovalProvenance.sourceLevels[index]);
  const stagedClassSpellRemovalKeys = new Set(
    creaturePropertiesDialog.draft.classSpellRemovalTargets.map(classSpellRemovalTargetKey),
  );
  const visibleClassSpellRemovalEntries = classSpellRemovalProvenance?.entries.filter((entry) =>
    entry.target.classSlotIndex === creatureSpellsClassFilterIndex &&
    (creatureSpellsLevelFilter === "All Levels" ||
      String(entry.target.spellLevel) === creatureSpellsLevelFilter)) ?? [];
  const creatureClassSpellReorderEditable = classSpellReorderProvenance !== null &&
    creaturePropertiesDialog.draft.classEntries.length ===
      classSpellReorderProvenance.sourceClassIds.length &&
    creaturePropertiesDialog.draft.classEntries.every((entry, index) =>
      entry.classId === classSpellReorderProvenance.sourceClassIds[index] &&
      entry.level === classSpellReorderProvenance.sourceLevels[index]);
  const visibleClassSpellReorderLists = classSpellReorderProvenance?.lists.filter((list) =>
    list.classSlotIndex === creatureSpellsClassFilterIndex &&
    (creatureSpellsLevelFilter === "All Levels" ||
      String(list.spellLevel) === creatureSpellsLevelFilter)) ?? [];
  const creatureSkillListProvenance = readExistingCreatureSkillListProvenance(
    creaturePropertiesDialog.snapshotObject.source,
  );
  const creatureSkillDraftById = new Map(
    creaturePropertiesDialog.draft.skills.flatMap((entry, index) =>
      Number.isSafeInteger(entry.skillId) && Number(entry.skillId) >= 0
        ? [[Number(entry.skillId), { entry, index }] as const]
        : []),
  );
  const creatureSkillDraftComplete = creatureSkillListProvenance !== null &&
    creatureSkillDraftById.size === creatureSkillListProvenance.rowCount &&
    Array.from({ length: creatureSkillListProvenance.rowCount }, (_, skillId) => skillId)
      .every((skillId) => creatureSkillDraftById.has(skillId));
  const creatureSkillListEditable = !retainedCreature ||
    (creatureSkillCatalogStatus === "ready" && creatureSkillDraftComplete &&
      isExistingCreatureSkillCatalogAdmitted(
        creaturePropertiesDialog.snapshotObject.source,
        creatureSkillCatalog,
      ));
  const visibleCreatureSkillDraftRows = retainedCreature && creatureSkillListEditable &&
    creatureSkillCatalog
    ? creatureSkillCatalog.items.flatMap((row) => {
        const draftRow = creatureSkillDraftById.get(row.rowIndex);
        return draftRow ? [{ ...draftRow, displayName: row.displayName }] : [];
      })
    : creaturePropertiesDialog.draft.skills.map((entry, index) => ({
        entry,
        index,
        displayName: entry.skill,
      }));
  const creatureSkillListRequiresTruncation = creatureSkillListProvenance !== null &&
    creatureSkillListProvenance.sourceRanks.length > creatureSkillListProvenance.rowCount;
  const retainedHitPointState = readExistingCreatureHitPointState(
    creaturePropertiesDialog.snapshotObject.source,
  );
  const creatureHitPointsEditable = !retainedCreature ||
    canEditExistingCreatureHitPoints(creaturePropertiesDialog.snapshotObject.source);
  const creatureClassLevelsEditable = !retainedCreature ||
    (canEditExistingCreatureClassLevels(
      creaturePropertiesDialog.snapshotObject.source,
      creaturePropertiesDialog.snapshotObject.creatureProperties?.classEntries,
    ) && (!creatureClassIdsChanged || creatureClassIdentityEditable));
  const creatureHitPointCalculation = retainedHitPointState
    ? calculateCreatureHitPoints({
        baseHitPoints: retainedHitPointState.hitPoints.value,
        constitution: creaturePropertiesDialog.draft.constitution,
        racialConstitutionAdjust:
          retainedHitPointState.racialTypes!.constitutionAdjust,
        classLevels: creatureClassLevelsEditable
          ? creaturePropertiesDialog.draft.classEntries.map((entry) => entry.level)
          : retainedHitPointState.classLevels,
        featRow40Present: retainedHitPointState.featRow40Present,
      })
    : null;
  const minimumBaseHitPoints = creatureHitPointCalculation?.minimumBaseHitPoints ?? 1;
  const creaturePortraitProvenance = readExistingCreaturePortraitProvenance(
    creaturePropertiesDialog.snapshotObject.source,
  );
  const creaturePortraitRows = admittedCreaturePortraitRows(
    creaturePropertiesDialog.snapshotObject.source,
    creaturePortraitCatalog,
  );
  const creaturePortraitEditable = creaturePortraitProvenance !== null &&
    creaturePropertiesDialog.draft.genderId ===
      creaturePortraitProvenance.genderExpectedValue &&
    creaturePortraitRows.length > 0;
  const creaturePortraitOptions = creaturePortraitRows.some(
    (row) => row.rowIndex === creaturePropertiesDialog.draft.portraitId,
  ) ? creaturePortraitRows : [
    ...(creaturePropertiesDialog.draft.portraitId === undefined ? [] : [{
      rowIndex: creaturePropertiesDialog.draft.portraitId,
      baseResRef: creaturePropertiesDialog.draft.portraitResRef,
      sex: creaturePortraitProvenance?.genderExpectedValue ?? 0,
      race: creaturePortraitProvenance?.raceExpectedValue ?? 0,
      plot: 0 as const,
    }]),
    ...creaturePortraitRows,
  ];
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
  const creatureFeatListProvenance = readExistingCreatureFeatListProvenance(
    creaturePropertiesDialog.snapshotObject.source,
  );
  const creatureFeatListEditable = !retainedCreature ||
    (creatureFeatCatalogStatus === "ready" &&
      isExistingCreatureFeatCatalogAdmitted(
        creaturePropertiesDialog.snapshotObject.source,
        creatureFeatCatalog,
      ));
  const creatureFeatsSource = retainedCreature
    ? materializeExistingCreatureFeats(
        creaturePropertiesDialog.snapshotObject.source,
        creaturePropertiesDialog.snapshotObject.creatureProperties?.feats ?? [],
        creaturePropertiesDialog.draft.feats,
        creatureFeatCatalog,
      )
    : creaturePropertiesDialog.draft.feats;
  const creatureFeatFilterOptions = [
    "All Feats",
    ...new Set(creatureFeatsSource.map((entry) => entry.type)),
  ];
  const creatureFeatsRows =
    creatureFeatsFilter === "All Feats"
      ? creatureFeatsSource
      : creatureFeatsSource.filter((entry) => entry.type === creatureFeatsFilter);
  const creatureSpecialAbilityListProvenance =
    readExistingCreatureSpecialAbilityListProvenance(
      creaturePropertiesDialog.snapshotObject.source,
    );
  const creatureSpecialAbilityListEditable = !retainedCreature ||
    (creatureSpecialAbilityCatalogStatus === "ready" &&
      isExistingCreatureSpecialAbilityCatalogAdmitted(
        creaturePropertiesDialog.snapshotObject.source,
        creatureSpecialAbilityCatalog,
      ));
  const materializedCreatureSpecialAbilities = retainedCreature
    ? materializeExistingCreatureSpecialAbilities(
        creaturePropertiesDialog.snapshotObject.source,
        creaturePropertiesDialog.snapshotObject.creatureProperties?.specialAbilities ?? [],
        creaturePropertiesDialog.draft.specialAbilities,
        creatureSpecialAbilityCatalog,
      )
    : creaturePropertiesDialog.draft.specialAbilities;
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
  const creatureSpellSource = creaturePropertiesDialog.draft.spells.filter((entry) =>
    entry.classIndex === undefined ||
    !creaturePropertiesDialog.draft.classSpellClearSlotIndices.includes(entry.classIndex));
  const creatureSpellsRows =
    creatureSpellSource.filter((entry) =>
      (entry.classIndex === undefined || entry.classIndex === creatureSpellsClassFilterIndex) &&
      (creatureSpellsLevelFilter === "All Levels" ||
        String(entry.spellLevel) === creatureSpellsLevelFilter));
  const creatureClassFilterEntries = creaturePropertiesDialog.draft.classEntries
    .map((entry) => entry.className.trim())
    .filter((entry, index) => entry.length > 0 || index === 0)
    .slice(0, 8);
  const creatureSpellsSummaryText =
    creatureSpellsRows.map((entry) => `${entry.name} (L${entry.spellLevel})`).join("\n") ||
    "No spells in current filter";
  const creatureSpecialAbilitiesSource = materializedCreatureSpecialAbilities;
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
                    <p className="canvas-creature-properties-cell-value">
                      FirstName: {creaturePropertiesDialog.draft.firstNameControlState}
                    </p>
                    <label className="canvas-placeable-properties-field-row">
                      <span>First Name</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          aria-label="First Name"
                          value={creaturePropertiesDialog.draft.firstName}
                          disabled={
                            creaturePropertiesDialog.draft.firstNameControlState !== "ACTIVE_NOW"
                          }
                          maxLength={MAX_CREATURE_FIRST_NAME_ASCII_BYTES}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("firstName", event.target.value)
                          }
                        />
                        <button type="button" disabled aria-label="Browse first name">
                          ...
                        </button>
                      </div>
                    </label>
                    {creaturePropertiesDialog.draft.firstNameControlState === "ACTIVE_NOW" ? (
                      <LocalizedStringEntryEditor
                        objectLabel="Creature"
                        fieldLabel="First Name"
                        entries={creaturePropertiesDialog.draft.firstNameEntries}
                        defaultTextMaxLength={MAX_CREATURE_FIRST_NAME_ASCII_BYTES}
                        entryTextMaxLength={MAX_CREATURE_LOCALIZED_STRING_ENTRY_BYTES}
                        maxEntries={MAX_CREATURE_LOCALIZED_STRING_ENTRIES}
                        maxTotalTextLength={MAX_CREATURE_LOCALIZED_STRING_TOTAL_TEXT_BYTES}
                        isInlineText={isCreatureNameInlineAsciiText}
                        onChange={(entries) => updateCreaturePropertiesDraftField(
                          "firstNameEntries",
                          entries,
                        )}
                      />
                    ) : null}
                    <p className="canvas-creature-properties-cell-value">
                      LastName: {creaturePropertiesDialog.draft.lastNameControlState}
                    </p>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Last Name</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          aria-label="Last Name"
                          value={creaturePropertiesDialog.draft.lastName}
                          disabled={
                            creaturePropertiesDialog.draft.lastNameControlState !== "ACTIVE_NOW"
                          }
                          maxLength={MAX_CREATURE_LAST_NAME_ASCII_BYTES}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("lastName", event.target.value)
                          }
                        />
                        <button type="button" disabled aria-label="Browse last name">
                          ...
                        </button>
                      </div>
                    </label>
                    {creaturePropertiesDialog.draft.lastNameControlState === "ACTIVE_NOW" ? (
                      <LocalizedStringEntryEditor
                        objectLabel="Creature"
                        fieldLabel="Last Name"
                        entries={creaturePropertiesDialog.draft.lastNameEntries}
                        defaultTextMaxLength={MAX_CREATURE_LAST_NAME_ASCII_BYTES}
                        entryTextMaxLength={MAX_CREATURE_LOCALIZED_STRING_ENTRY_BYTES}
                        maxEntries={MAX_CREATURE_LOCALIZED_STRING_ENTRIES}
                        maxTotalTextLength={MAX_CREATURE_LOCALIZED_STRING_TOTAL_TEXT_BYTES}
                        isInlineText={isCreatureNameInlineAsciiText}
                        onChange={(entries) => updateCreaturePropertiesDraftField(
                          "lastNameEntries",
                          entries,
                        )}
                      />
                    ) : null}
                    <p className="canvas-creature-properties-cell-value">
                      Description: {creaturePropertiesDialog.draft.descriptionControlState}
                    </p>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Description</span>
                      <div className="canvas-placeable-properties-field-control">
                        <textarea
                          aria-label="Description"
                          value={creaturePropertiesDialog.draft.description}
                          disabled={
                            creaturePropertiesDialog.draft.descriptionControlState !== "ACTIVE_NOW"
                          }
                          maxLength={MAX_CREATURE_DESCRIPTION_ASCII_BYTES}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("description", event.target.value)
                          }
                        />
                        <button type="button" disabled aria-label="Browse description">
                          ...
                        </button>
                      </div>
                    </label>
                    {creaturePropertiesDialog.draft.descriptionControlState === "ACTIVE_NOW" ? (
                      <LocalizedStringEntryEditor
                        objectLabel="Creature"
                        fieldLabel="Description"
                        entries={creaturePropertiesDialog.draft.descriptionEntries}
                        defaultTextMaxLength={MAX_CREATURE_DESCRIPTION_ASCII_BYTES}
                        entryTextMaxLength={MAX_CREATURE_LOCALIZED_STRING_ENTRY_BYTES}
                        maxEntries={MAX_CREATURE_LOCALIZED_STRING_ENTRIES}
                        maxTotalTextLength={MAX_CREATURE_LOCALIZED_STRING_TOTAL_TEXT_BYTES}
                        isInlineText={isCreatureNameInlineAsciiText}
                        onChange={(entries) => updateCreaturePropertiesDraftField(
                          "descriptionEntries",
                          entries,
                        )}
                      />
                    ) : null}
                    <p className="canvas-creature-properties-cell-value">
                      Tag: {creaturePropertiesDialog.draft.tagControlState}
                    </p>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Tag</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.tag}
                          disabled={
                            creaturePropertiesDialog.draft.tagControlState !== "ACTIVE_NOW"
                          }
                          maxLength={MAX_CREATURE_TAG_CODE_UNITS}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("tag", event.target.value)
                          }
                        />
                      </div>
                    </label>
                    <p className="canvas-creature-properties-cell-value">
                      Race: PRESERVE_ONLY
                    </p>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Race</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          disabled
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
                      <span>Appearance Type</span>
                      <div className="canvas-placeable-properties-field-control">
                        {creatureAppearanceEditable && creatureAppearanceCatalog ? (
                          <>
                            <select
                              aria-label="Creature Appearance Type"
                              value={creaturePropertiesDialog.draft.appearanceType ?? ""}
                              onChange={(event) => {
                                const rowIndex = Number(event.target.value);
                                if (Number.isSafeInteger(rowIndex)) {
                                  updateCreaturePropertiesDraftField("appearanceType", rowIndex);
                                }
                              }}
                            >
                              {creatureAppearanceCatalog.items.map((item) => (
                                <option key={item.rowIndex} value={item.rowIndex}>
                                  {item.rowIndex} — {item.displayName}
                                </option>
                              ))}
                            </select>
                            <form onSubmit={(event) => {
                              event.preventDefault();
                              onCreatureAppearanceSearch?.(appearanceQuery);
                            }}>
                              <input
                                aria-label="Creature Appearance Search"
                                type="search"
                                maxLength={128}
                                value={appearanceQuery}
                                onChange={(event) => setAppearanceQuery(event.target.value)}
                              />
                              <button
                                type="submit"
                                aria-label="Search Creature Appearance rows"
                                disabled={!onCreatureAppearanceSearch}
                              >
                                Search
                              </button>
                            </form>
                            <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                          </>
                        ) : (
                          <>
                            <input
                              aria-label="Creature Appearance Type"
                              type="text"
                              disabled
                              readOnly
                              value={creaturePropertiesDialog.draft.appearanceType ?? ""}
                            />
                            <span className="canvas-accessibility-hidden">PRESERVE_ONLY</span>
                            {hasEditableAppearanceProvenance &&
                            creatureAppearanceCatalogStatus === "loading" ? (
                              <span role="status">Loading Creature Appearance rows</span>
                            ) : null}
                            {hasEditableAppearanceProvenance &&
                            creatureAppearanceCatalogStatus === "error" ? (
                              <span role="alert">
                                {creatureAppearanceCatalogError ??
                                  "Creature Appearance rows are unavailable."}
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Phenotype</span>
                      <div className="canvas-placeable-properties-field-control">
                        {creaturePhenotypeEditable && creaturePhenotypeCatalog ? (
                          <>
                            <select
                              aria-label="Creature Phenotype"
                              value={creaturePropertiesDialog.draft.phenotypeId ?? ""}
                              onChange={(event) => {
                                const rowIndex = Number(event.target.value);
                                if (Number.isSafeInteger(rowIndex)) {
                                  updateCreaturePropertiesDraftField("phenotypeId", rowIndex);
                                }
                              }}
                            >
                              {creaturePhenotypeCatalog.items.map((item) => (
                                <option key={item.rowIndex} value={item.rowIndex}>
                                  {item.rowIndex} — {item.displayName}
                                </option>
                              ))}
                            </select>
                            <form onSubmit={(event) => {
                              event.preventDefault();
                              onCreaturePhenotypeSearch?.(phenotypeQuery);
                            }}>
                              <input
                                aria-label="Creature Phenotype Search"
                                type="search"
                                maxLength={128}
                                value={phenotypeQuery}
                                onChange={(event) => setPhenotypeQuery(event.target.value)}
                              />
                              <button
                                type="submit"
                                aria-label="Search Creature Phenotype rows"
                                disabled={!onCreaturePhenotypeSearch}
                              >
                                Search
                              </button>
                            </form>
                            <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                          </>
                        ) : (
                          <>
                            <input
                              aria-label="Creature Phenotype"
                              type="text"
                              disabled
                              readOnly
                              value={creaturePropertiesDialog.draft.phenotypeId ??
                                creaturePropertiesDialog.draft.phenotype}
                            />
                            <span className="canvas-accessibility-hidden">PRESERVE_ONLY</span>
                            {hasEditablePhenotypeProvenance &&
                            creaturePhenotypeCatalogStatus === "loading" ? (
                              <span role="status">Loading Creature Phenotype rows</span>
                            ) : null}
                            {hasEditablePhenotypeProvenance &&
                            creaturePhenotypeCatalogStatus === "error" ? (
                              <span role="alert">
                                {creaturePhenotypeCatalogError ??
                                  "Creature Phenotype rows are unavailable."}
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Gender</span>
                      <div className="canvas-placeable-properties-field-control">
                        {creatureGenderEditable && creatureGenderCatalog ? (
                          <>
                            <select
                              aria-label="Creature Gender"
                              value={creaturePropertiesDialog.draft.genderId ?? ""}
                              onChange={(event) => {
                                const rowIndex = Number(event.target.value);
                                if (Number.isSafeInteger(rowIndex)) {
                                  updateCreaturePropertiesDraftField("genderId", rowIndex);
                                }
                              }}
                            >
                              {creatureGenderCatalog.items.map((item) => (
                                <option key={item.rowIndex} value={item.rowIndex}>
                                  {item.rowIndex} — {item.displayName}
                                </option>
                              ))}
                            </select>
                            <form onSubmit={(event) => {
                              event.preventDefault();
                              onCreatureGenderSearch?.(genderQuery);
                            }}>
                              <input
                                aria-label="Creature Gender Search"
                                type="search"
                                maxLength={128}
                                value={genderQuery}
                                onChange={(event) => setGenderQuery(event.target.value)}
                              />
                              <button
                                type="submit"
                                aria-label="Search Creature Gender rows"
                                disabled={!onCreatureGenderSearch}
                              >
                                Search
                              </button>
                            </form>
                            <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                          </>
                        ) : (
                          <>
                            <input
                              aria-label="Creature Gender"
                              type="text"
                              disabled
                              readOnly
                              value={creaturePropertiesDialog.draft.genderId ??
                                creaturePropertiesDialog.draft.gender}
                            />
                            <span className="canvas-accessibility-hidden">PRESERVE_ONLY</span>
                            {hasEditableGenderProvenance &&
                            creatureGenderCatalogStatus === "loading" ? (
                              <span role="status">Loading Creature Gender rows</span>
                            ) : null}
                            {hasEditableGenderProvenance &&
                            creatureGenderCatalogStatus === "error" ? (
                              <span role="alert">
                                {creatureGenderCatalogError ??
                                  "Creature Gender rows are unavailable."}
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>
                        Challenge Rating: {hasEditableChallengeRatingProvenance
                          ? "ACTIVE_NOW"
                          : "PRESERVE_ONLY"}
                      </span>
                      <div className="canvas-placeable-properties-field-control is-narrow">
                        <input
                          aria-label="Challenge Rating"
                          type="number"
                          step="0.1"
                          min={0}
                          max={1000}
                          disabled={!hasEditableChallengeRatingProvenance}
                          value={creaturePropertiesDialog.draft.challengeRating}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField(
                              "challengeRating",
                              Number.parseFloat(event.target.value)
                            )
                          }
                        />
                      </div>
                    </label>
                  </fieldset>

                  <div className="canvas-creature-properties-basic-panel-stack">
                    <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                      <legend>Portrait</legend>
                      {retainedCreature ? (
                        <p className="canvas-creature-properties-cell-value">
                          Portrait: {creaturePortraitEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                        </p>
                      ) : null}
                      <div className="canvas-placeable-properties-portrait-row">
                        <div className="canvas-placeable-properties-portrait-preview">
                          <span>{creaturePropertiesDialog.draft.portraitResRef || "Portrait"}</span>
                        </div>
                        <div className="canvas-placeable-properties-field-control">
                          {retainedCreature ? (
                            <select
                              aria-label="Creature Portrait"
                              disabled={!creaturePortraitEditable}
                              value={creaturePropertiesDialog.draft.portraitId ?? ""}
                              onChange={(event) => updateCreaturePropertiesDraftField(
                                "portraitId",
                                Number.parseInt(event.target.value, 10),
                              )}
                            >
                              {creaturePortraitOptions.map((row) => (
                                <option key={row.rowIndex} value={row.rowIndex}>
                                  {row.rowIndex} — {row.baseResRef}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                      </div>
                      {!retainedCreature && activeResourcePicker === "portrait" ? (
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
                      <p className="canvas-creature-properties-cell-value">
                        Conversation: {creaturePropertiesDialog.draft.conversationControlState}
                      </p>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Conversation</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            aria-label="Conversation"
                            disabled={!creatureConversationEditable}
                            maxLength={MAX_CREATURE_CONVERSATION_RESREF_BYTES}
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
                            disabled={!creatureConversationEditable}
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
                      {activeResourcePicker === "conversation" && creatureConversationEditable ? (
                        <select
                          aria-label="Select conversation"
                          disabled={!creatureConversationEditable}
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
                      <p className="canvas-creature-properties-cell-value">
                        No Interrupt: {creaturePropertiesDialog.draft.noInterruptControlState}
                      </p>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          disabled={!creatureInterruptableEditable}
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
                          const abilityScoreKey = scoreField as CreatureAbilityScoreKey;
                          const scoreEditable =
                            creaturePropertiesDialog.snapshotObject.source?.type !== "aurora_git" ||
                            canEditExistingCreatureAbilityScore(
                              creaturePropertiesDialog.snapshotObject.source,
                              abilityScoreKey,
                            );
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
                              <th scope="row">
                                <span>{label}</span>
                                <small>{`${label}: ${scoreEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                              </th>
                              <td>
                                <input
                                  type="number"
                                  step="1"
                                  min={0}
                                  max={255}
                                  disabled={!scoreEditable}
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
                                <small>{`${label} Racial Modifier: PRESERVE_ONLY`}</small>
                                <input
                                  type="number"
                                  step="1"
                                  disabled
                                  aria-label={`${label} racial modifier`}
                                  value={racialValue}
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
                          {([
                            ["Fortitude", "fortitudeBase", "fortitudeBonus", "constitution", "fortitude"],
                            ["Reflex", "reflexBase", "reflexBonus", "dexterity", "reflex"],
                            ["Will", "willBase", "willBonus", "wisdom", "will"]
                          ] as const).map(([label, baseField, bonusField, abilityField, storageKey]) => {
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
                            const bonusEditable = isSavingThrowBonusEditable(storageKey);
                            return (
                              <tr key={label}>
                                <th scope="row">
                                  {label}
                                  <small>{`${label} Bonus: ${bonusEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                                </th>
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
                                    min={0}
                                    max={250}
                                    disabled={!bonusEditable}
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
                        <span>
                          Natural AC
                          <small>{`Natural AC: ${naturalArmorClassEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                        </span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            min={0}
                            max={255}
                            disabled={!naturalArmorClassEditable}
                            aria-label="Natural AC"
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
                        <span>Base AC <small>Base AC: PRESERVE_ONLY</small></span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            disabled
                            aria-label="Base AC"
                            value={creaturePropertiesDialog.draft.baseArmorClass}
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Dexterity Bonus <small>Dexterity Bonus: PRESERVE_ONLY</small></span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            disabled
                            aria-label="Dexterity Bonus"
                            value={creaturePropertiesDialog.draft.dexterityBonus}
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Size Modifier <small>Size Modifier: PRESERVE_ONLY</small></span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            disabled
                            aria-label="Size Modifier"
                            value={creaturePropertiesDialog.draft.sizeModifier}
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>
                          Base Hit Points
                          <small>{`Base Hit Points: ${creatureHitPointsEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                        </span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            min={minimumBaseHitPoints}
                            max={10_000}
                            disabled={!creatureHitPointsEditable}
                            aria-label="Base Hit Points"
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
                        <span>Hit Point Bonuses <small>DERIVED_READ_ONLY</small></span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            disabled
                            aria-label="Hit Point Bonuses"
                            value={creaturePropertiesDialog.draft.hitPointBonuses}
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Current Hit Points</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            disabled
                            aria-label="Current Hit Points"
                            value={creaturePropertiesDialog.draft.currentHitPoints}
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Max Hit Points</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            disabled
                            aria-label="Max Hit Points"
                            value={creaturePropertiesDialog.draft.maxHitPoints}
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
                          {retainedCreature ? (
                            creatureWalkRateEditable && creatureWalkRateCatalog ? (
                              <>
                                <select
                                  aria-label="Creature Walk Rate"
                                  value={creaturePropertiesDialog.draft.advancedSettings
                                    .walkRateId ?? ""}
                                  onChange={(event) => {
                                    const rowIndex = Number(event.target.value);
                                    if (Number.isSafeInteger(rowIndex)) {
                                      updateCreatureAdvancedField("walkRateId", rowIndex);
                                    }
                                  }}
                                >
                                  {creatureWalkRateCatalog.items.map((item) => (
                                    <option key={item.rowIndex} value={item.rowIndex}>
                                      {item.rowIndex} — {item.displayName}
                                    </option>
                                  ))}
                                </select>
                                <form onSubmit={(event) => {
                                  event.preventDefault();
                                  onCreatureWalkRateSearch?.(walkRateQuery);
                                }}>
                                  <input
                                    aria-label="Creature Walk Rate Search"
                                    type="search"
                                    maxLength={128}
                                    value={walkRateQuery}
                                    onChange={(event) => setWalkRateQuery(event.target.value)}
                                  />
                                  <button
                                    type="submit"
                                    aria-label="Search Creature Walk Rate rows"
                                    disabled={!onCreatureWalkRateSearch}
                                  >
                                    Search
                                  </button>
                                </form>
                                <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                              </>
                            ) : (
                              <>
                                <input
                                  aria-label="Creature Walk Rate"
                                  type="text"
                                  disabled
                                  readOnly
                                  value={creaturePropertiesDialog.draft.advancedSettings
                                    .walkRateId ?? creaturePropertiesDialog.draft.movementRate}
                                />
                                <span className="canvas-accessibility-hidden">PRESERVE_ONLY</span>
                                {hasEditableWalkRateProvenance &&
                                creatureWalkRateCatalogStatus === "loading" ? (
                                  <span role="status">Loading Creature WalkRate rows</span>
                                ) : null}
                                {hasEditableWalkRateProvenance &&
                                creatureWalkRateCatalogStatus === "error" ? (
                                  <span role="alert">
                                    {creatureWalkRateCatalogError ??
                                      "Creature WalkRate rows are unavailable."}
                                  </span>
                                ) : null}
                              </>
                            )
                          ) : (
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
                          )}
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
                      disabled={creaturePropertiesDialog.snapshotObject.source?.type === "aurora_git"}
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
                          <span>
                            {entry.label}
                            <small>{`${entry.label}: ${creatureAppearancePartEditable(entry.key) ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                          </span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="number"
                              min={0}
                              max={creatureBodyPartMaximum(entry.key as CreatureBodyPartKey)}
                              step={1}
                              aria-label={`Creature ${entry.label}`}
                              value={creaturePropertiesDialog.draft.appearanceParts[entry.key]}
                              disabled={!creaturePropertiesDialog.draft.appearancePartBased ||
                                !creatureAppearancePartEditable(entry.key)}
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
                            <span>
                              {pair.rightLabel}
                              <small>{`${pair.rightLabel}: ${creatureAppearancePartEditable(pair.rightKey) ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                            </span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="number"
                                min={0}
                                max={creatureBodyPartMaximum(pair.rightKey as CreatureBodyPartKey)}
                                step={1}
                                aria-label={`Creature ${pair.rightLabel}`}
                                value={
                                  creaturePropertiesDialog.draft.appearanceParts[pair.rightKey]
                                }
                                disabled={!creaturePropertiesDialog.draft.appearancePartBased ||
                                  !creatureAppearancePartEditable(pair.rightKey)}
                                onChange={(event) =>
                                  updateCreatureAppearancePart(pair.rightKey, event.target.value)
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>
                              {pair.leftLabel}
                              <small>{`${pair.leftLabel}: ${creatureAppearancePartEditable(pair.leftKey) ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                            </span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="number"
                                min={0}
                                max={creatureBodyPartMaximum(pair.leftKey as CreatureBodyPartKey)}
                                step={1}
                                aria-label={`Creature ${pair.leftLabel}`}
                                value={
                                  creaturePropertiesDialog.draft.appearanceParts[pair.leftKey]
                                }
                                disabled={!creaturePropertiesDialog.draft.appearancePartBased ||
                                  !creatureAppearancePartEditable(pair.leftKey)}
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
                      {([
                        {
                          kind: CREATURE_APPEARANCE_EXTRA_PAIR.rightKey,
                          label: CREATURE_APPEARANCE_EXTRA_PAIR.rightLabel,
                          catalog: creatureWingsCatalog,
                          status: creatureWingsCatalogStatus,
                          error: creatureWingsCatalogError,
                          query: wingsQuery,
                          setQuery: setWingsQuery,
                          search: onCreatureWingsSearch,
                        },
                        {
                          kind: CREATURE_APPEARANCE_EXTRA_PAIR.leftKey,
                          label: CREATURE_APPEARANCE_EXTRA_PAIR.leftLabel,
                          catalog: creatureTailCatalog,
                          status: creatureTailCatalogStatus,
                          error: creatureTailCatalogError,
                          query: tailQuery,
                          setQuery: setTailQuery,
                          search: onCreatureTailSearch,
                        },
                      ] as const).map((entry) => {
                        const retained = creaturePropertiesDialog.snapshotObject.source?.type ===
                          "aurora_git";
                        const editable = creatureAppendageEditable(entry.kind);
                        const hasProvenance = hasEditableCreatureAppendageProvenance(entry.kind);
                        return (
                          <label
                            key={entry.kind}
                            className="canvas-placeable-properties-field-row"
                          >
                            <span>
                              {entry.label}
                              <small>{`${entry.label}: ${editable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                            </span>
                            <div className="canvas-placeable-properties-field-control">
                              {!retained ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={0xffff_ffff}
                                  step={1}
                                  aria-label={`Creature ${entry.label}`}
                                  value={creaturePropertiesDialog.draft.appearanceParts[entry.kind]}
                                  onChange={(event) =>
                                    updateCreatureAppearancePart(entry.kind, event.target.value)}
                                />
                              ) : editable && entry.catalog ? (
                                <>
                                  <select
                                    aria-label={`Creature ${entry.label}`}
                                    value={creaturePropertiesDialog.draft.appearanceParts[entry.kind]}
                                    onChange={(event) =>
                                      updateCreatureAppearancePart(entry.kind, event.target.value)}
                                  >
                                    {entry.catalog.items.map((item) => (
                                      <option key={item.rowIndex} value={item.rowIndex}>
                                        {item.rowIndex} — {item.displayName}
                                      </option>
                                    ))}
                                  </select>
                                  <form onSubmit={(event) => {
                                    event.preventDefault();
                                    entry.search?.(entry.query);
                                  }}>
                                    <input
                                      aria-label={`Creature ${entry.label} Search`}
                                      type="search"
                                      value={entry.query}
                                      maxLength={128}
                                      onChange={(event) => entry.setQuery(event.target.value)}
                                    />
                                    <button
                                      type="submit"
                                      aria-label={`Search Creature ${entry.label} rows`}
                                      disabled={!entry.search}
                                    >
                                      Search
                                    </button>
                                  </form>
                                  <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                                </>
                              ) : (
                                <>
                                  <input
                                    aria-label={`Creature ${entry.label}`}
                                    type="text"
                                    disabled
                                    readOnly
                                    value={creaturePropertiesDialog.draft.appearanceParts[entry.kind]}
                                  />
                                  <span className="canvas-accessibility-hidden">PRESERVE_ONLY</span>
                                  {hasProvenance && entry.status === "loading" ? (
                                    <span role="status">{`Loading Creature ${entry.label} rows`}</span>
                                  ) : null}
                                  {hasProvenance && entry.status === "error" ? (
                                    <span role="alert">
                                      {entry.error ?? `Creature ${entry.label} rows are unavailable.`}
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                    <legend>Colors</legend>
                    <div className="canvas-placeable-properties-dual-fields">
                      <label className="canvas-placeable-properties-field-row">
                        <span>
                          Skin
                          <small>{`Skin: ${creatureAppearanceColorEditable("skin") ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                        </span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="number"
                            min={0}
                            max={255}
                            step={1}
                            aria-label="Skin color"
                            value={creaturePropertiesDialog.draft.appearanceColors.skin}
                            disabled={!creatureAppearanceColorEditable("skin")}
                            onChange={(event) =>
                              updateCreatureAppearanceColor("skin", event.target.value)
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>
                          Hair
                          <small>{`Hair: ${creatureAppearanceColorEditable("hair") ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                        </span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="number"
                            min={0}
                            max={255}
                            step={1}
                            aria-label="Hair color"
                            value={creaturePropertiesDialog.draft.appearanceColors.hair}
                            disabled={!creatureAppearanceColorEditable("hair")}
                            onChange={(event) =>
                              updateCreatureAppearanceColor("hair", event.target.value)
                            }
                          />
                        </div>
                      </label>
                    </div>
                    <div className="canvas-placeable-properties-dual-fields">
                      <label className="canvas-placeable-properties-field-row">
                        <span>
                          Tattoo 1
                          <small>{`Tattoo 1: ${creatureAppearanceColorEditable("tattoo1") ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                        </span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="number"
                            min={0}
                            max={255}
                            step={1}
                            aria-label="Tattoo 1 color"
                            value={creaturePropertiesDialog.draft.appearanceColors.tattoo1}
                            disabled={!creatureAppearanceColorEditable("tattoo1")}
                            onChange={(event) =>
                              updateCreatureAppearanceColor("tattoo1", event.target.value)
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>
                          Tattoo 2
                          <small>{`Tattoo 2: ${creatureAppearanceColorEditable("tattoo2") ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                        </span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="number"
                            min={0}
                            max={255}
                            step={1}
                            aria-label="Tattoo 2 color"
                            value={creaturePropertiesDialog.draft.appearanceColors.tattoo2}
                            disabled={!creatureAppearanceColorEditable("tattoo2")}
                            onChange={(event) =>
                              updateCreatureAppearanceColor("tattoo2", event.target.value)
                            }
                          />
                        </div>
                      </label>
                    </div>
                  </fieldset>
                  <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                    <legend>Source-only Parts</legend>
                    <div className="canvas-placeable-properties-dual-fields">
                      <label className="canvas-placeable-properties-field-row">
                        <span>
                          Belt
                          <small>{`Belt: ${creatureSourceOnlyPartEditable("belt") ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                        </span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="number"
                            min={0}
                            max={creatureBodyPartMaximum("belt")}
                            step={1}
                            aria-label="Creature Belt"
                            value={creaturePropertiesDialog.draft.appearanceSourceOnlyParts.belt}
                            disabled={!creaturePropertiesDialog.draft.appearancePartBased ||
                              !creatureSourceOnlyPartEditable("belt")}
                            onChange={(event) =>
                              updateCreatureAppearanceSourceOnlyPart?.("belt", event.target.value)}
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>
                          Robe
                          <small>Robe: PRESERVE_ONLY</small>
                        </span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={creaturePropertiesDialog.draft.appearanceSourceOnlyParts.robe}
                            disabled
                            readOnly
                          />
                        </div>
                      </label>
                    </div>
                    <div className="canvas-placeable-properties-dual-fields">
                      <label className="canvas-placeable-properties-field-row">
                        <span>
                          Right Shoulder
                          <small>{`Right Shoulder: ${creatureSourceOnlyPartEditable("rightShoulder") ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                        </span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="number"
                            min={0}
                            max={creatureBodyPartMaximum("rightShoulder")}
                            step={1}
                            aria-label="Creature Right Shoulder"
                            value={
                              creaturePropertiesDialog.draft.appearanceSourceOnlyParts
                                .rightShoulder
                            }
                            disabled={!creaturePropertiesDialog.draft.appearancePartBased ||
                              !creatureSourceOnlyPartEditable("rightShoulder")}
                            onChange={(event) => updateCreatureAppearanceSourceOnlyPart?.(
                              "rightShoulder",
                              event.target.value,
                            )}
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>
                          Left Shoulder
                          <small>{`Left Shoulder: ${creatureSourceOnlyPartEditable("leftShoulder") ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                        </span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="number"
                            min={0}
                            max={creatureBodyPartMaximum("leftShoulder")}
                            step={1}
                            aria-label="Creature Left Shoulder"
                            value={
                              creaturePropertiesDialog.draft.appearanceSourceOnlyParts
                                .leftShoulder
                            }
                            disabled={!creaturePropertiesDialog.draft.appearancePartBased ||
                              !creatureSourceOnlyPartEditable("leftShoulder")}
                            onChange={(event) => updateCreatureAppearanceSourceOnlyPart?.(
                              "leftShoulder",
                              event.target.value,
                            )}
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
                      <span>
                        Alignment
                        <small>{`Alignment: ${creatureAlignmentEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}`}</small>
                      </span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          aria-label="Creature Alignment"
                          value={creaturePropertiesDialog.draft.alignment}
                          disabled={!creatureAlignmentEditable}
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
                    <p className="canvas-creature-properties-cell-value">
                      {retainedCreature
                        ? creatureClassIdentityEditable
                          ? "Class IDs/levels: ACTIVE_NOW · slot count: TAIL_ONLY · changed-slot spells: DESTRUCTIVE_CLEAR"
                          : creatureClassLevelsEditable
                            ? "Class IDs/spells: PRESERVE_ONLY · levels: ACTIVE_NOW"
                            : "ClassList: PRESERVE_ONLY"
                        : "ClassList: ACTIVE_NOW"}
                    </p>
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
                              {retainedCreature ? (
                                <select
                                  aria-label={`Class ${index + 1} ID`}
                                  disabled={!creatureClassIdentityEditable ||
                                    (creatureClassSlotCountChanged
                                      ? index < (classIdentityProvenance?.sourceClassIds.length ?? 0)
                                      : index >= (classIdentityProvenance?.sourceClassIds.length ?? 0))}
                                  value={entry.classId ?? ""}
                                  onChange={(event) =>
                                    updateCreatureClassEntry(
                                      index,
                                      "classId",
                                      Number(event.target.value),
                                    )}
                                >
                                  {entry.classId !== undefined &&
                                  !creatureClassCatalog?.items.some((row) =>
                                    row.rowIndex === entry.classId) ? (
                                    <option value={entry.classId}>{entry.classId}</option>
                                  ) : null}
                                  {(creatureClassCatalog?.items ?? []).map((row) => (
                                    <option key={row.rowIndex} value={row.rowIndex}>
                                      {row.rowIndex} · {row.displayName}
                                    </option>
                                  ))}
                                </select>
                              ) : (
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
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                aria-label={`Class ${index + 1} name`}
                                disabled={retainedCreature}
                                value={entry.className}
                                onChange={(event) =>
                                  updateCreatureClassEntry(index, "className", event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                aria-label={`Class ${index + 1} level`}
                                step="1"
                                min={1}
                                max={60}
                                disabled={retainedCreature && (creatureClassSlotCountChanged
                                  ? index < (classIdentityProvenance?.sourceClassIds.length ?? 0) ||
                                    !creatureHitPointsEditable
                                  : !creatureClassLevelsEditable)}
                                value={entry.level}
                                onChange={(event) =>
                                  updateCreatureClassEntry(
                                    index,
                                    "level",
                                    Math.min(
                                      60,
                                      Math.max(1, Number.parseFloat(event.target.value) || 1),
                                    )
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
                          disabled={retainedCreature}
                          value={creaturePropertiesDialog.draft.defaultPackage}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("defaultPackage", event.target.value)
                          }
                        />
                      </div>
                    </label>
                    <div className="canvas-creature-properties-aux-row">
                      <button
                        type="button"
                        disabled={creaturePropertiesDialog.draft.classEntries.length >= 8 ||
                          (retainedCreature && (!creatureClassIdentityEditable ||
                            creaturePropertiesDialog.draft.classEntries.length <
                              (classIdentityProvenance?.sourceClassIds.length ?? 0) ||
                            !creatureClassCatalog?.items.some((row) =>
                              !targetClassIds.includes(row.rowIndex))))}
                        onClick={appendCreatureClassSlot}
                      >
                        Add class slot
                      </button>
                      <button
                        type="button"
                        disabled={creaturePropertiesDialog.draft.classEntries.length <= 1 ||
                          (retainedCreature && !creatureClassIdentityEditable)}
                        onClick={truncateCreatureClassSlot}
                      >
                        Remove last class slot
                      </button>
                    </div>
                    {creatureClassSlotShrinking ? (
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          aria-label="Confirm removal of trailing class slots"
                          checked={creaturePropertiesDialog.draft
                            .classSlotResizeDestructiveRemovalConfirmed}
                          onChange={(event) => updateCreaturePropertiesDraftField(
                            "classSlotResizeDestructiveRemovalConfirmed",
                            event.target.checked,
                          )}
                        />
                        I confirm permanent removal of the trailing ClassList slots.
                      </label>
                    ) : null}
                    {retainedCreature && classIdentityProvenance ? (
                      <>
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            onCreatureClassSearch?.(classQuery);
                          }}
                        >
                          <input
                            aria-label="Search Creature Class rows"
                            value={classQuery}
                            maxLength={128}
                            onChange={(event) => setClassQuery(event.target.value)}
                          />
                          <button type="submit" disabled={!onCreatureClassSearch}>
                            Search classes
                          </button>
                        </form>
                        {creatureClassCatalogStatus === "loading" ? (
                          <span role="status">Loading Creature Class rows</span>
                        ) : null}
                        {creatureClassCatalogStatus === "error" ? (
                          <span role="alert">
                            {creatureClassCatalogError ?? "Creature Class rows are unavailable."}
                          </span>
                        ) : null}
                        {creatureClassIdsChanged ? (
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              aria-label="Confirm class spell list clear"
                              checked={creaturePropertiesDialog.draft
                                .classIdentityDestructiveSpellClearConfirmed}
                              onChange={(event) => updateCreaturePropertiesDraftField(
                                "classIdentityDestructiveSpellClearConfirmed",
                                event.target.checked,
                              )}
                            />
                            I confirm that KnownList0..13 and MemorizedList0..13 will be cleared
                            for every changed class slot.
                          </label>
                        ) : null}
                      </>
                    ) : null}
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
                  <p className="canvas-creature-properties-cell-value">
                    SkillList: {creatureSkillListEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </p>
                  {retainedCreature && creatureSkillCatalogStatus === "loading" ? (
                    <span>Loading authoritative skills.2da rows...</span>
                  ) : null}
                  {retainedCreature && creatureSkillCatalogStatus === "error" ? (
                    <span role="alert">
                      {creatureSkillCatalogError ?? "Creature SkillList rows are unavailable."}
                    </span>
                  ) : null}
                  {retainedCreature && !creatureSkillListProvenance ? (
                    <span>Exact SkillList Byte-vector/catalog provenance is unavailable.</span>
                  ) : null}
                  {creatureSkillListRequiresTruncation ? (
                    <label className="canvas-placeable-properties-field-row">
                      <span>
                        Confirm truncation from {creatureSkillListProvenance!.sourceRanks.length} to{" "}
                        {creatureSkillListProvenance!.rowCount} physical rows
                      </span>
                      <input
                        aria-label="Confirm SkillList truncation"
                        type="checkbox"
                        disabled={!creatureSkillListEditable}
                        checked={creaturePropertiesDialog.draft.skillListTruncationConfirmed}
                        onChange={(event) => updateCreaturePropertiesDraftField(
                          "skillListTruncationConfirmed",
                          event.target.checked,
                        )}
                      />
                    </label>
                  ) : null}
                  <table className="canvas-creature-properties-table">
                    <thead>
                      <tr>
                        <th scope="col">Skill</th>
                        <th scope="col">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCreatureSkillDraftRows.map(({ entry, index, displayName }) => (
                        <tr key={entry.skillId ?? `${entry.skill}_${index}`}>
                          <th scope="row">{displayName}</th>
                          <td>
                            <input
                              type="number"
                              aria-label={`${displayName} rank`}
                              step="1"
                              min={0}
                              max={255}
                              disabled={!creatureSkillListEditable}
                              value={entry.rank}
                              onChange={(event) =>
                                updateCreatureSkillRank(
                                  index,
                                  Math.min(
                                    255,
                                    Math.max(0, Math.trunc(Number.parseFloat(event.target.value) || 0))
                                  )
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
                  inputMaxLength={16}
                  inputPattern="[a-z0-9_]*"
                  isSlotDisabled={(slot) => !isCreatureScriptSlotEditable(slot)}
                  slotStatus={(slot) =>
                    isCreatureScriptSlotEditable(slot) ? "ACTIVE_NOW" : "PRESERVE_ONLY"
                  }
                  slotStatusClassName="canvas-creature-properties-cell-value"
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
                    <p className="canvas-creature-properties-cell-value">
                      TemplateResRef: {creatureTemplateResRefEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                    </p>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Blueprint ResRef</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          disabled={!creatureTemplateResRefEditable}
                          maxLength={CREATURE_TEMPLATE_RESREF_MAX_CODE_UNITS}
                          value={creaturePropertiesDialog.draft.advancedSettings.blueprintResRef}
                          onChange={(event) =>
                            updateCreatureAdvancedField("blueprintResRef", event.target.value)
                          }
                        />
                      </div>
                    </label>
                    <p className="canvas-creature-properties-cell-value">
                      Advanced binary flags: Disarmable={creaturePropertiesDialog.draft.disarmableControlState};
                      {" "}Plot={creaturePropertiesDialog.draft.plotControlState};
                      {" "}Immortal={creaturePropertiesDialog.draft.immortalControlState};
                      {" "}Lootable={creaturePropertiesDialog.draft.lootableControlState};
                      {" "}NoPermDeath={creaturePropertiesDialog.draft.noPermanentDeathControlState}
                    </p>
                    <p className="canvas-creature-properties-cell-value">
                      Death remains: Treasure Model={creatureBodyBagEditable
                        ? "ACTIVE_NOW"
                        : "PRESERVE_ONLY"};{" "}
                      DecayTime={creatureDecayTimeEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                    </p>
                    <div className="canvas-placeable-properties-basic-flags">
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.advancedSettings.disarmable}
                          disabled={!creatureDisarmableEditable}
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
                          disabled={!creaturePlotEditable}
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
                          disabled={!creatureLootableEditable}
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
                          disabled={!creatureNoPermanentDeathEditable}
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
                          disabled={!creatureImmortalEditable}
                          onChange={(event) =>
                            updateCreatureAdvancedField("immortal", event.target.checked)
                          }
                        />
                        Immortal
                      </label>
                      {retainedCreature ? (
                        <div className="canvas-placeable-properties-field-row">
                          <span>
                            Starting Package: {creatureStartingPackageEditable
                              ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                          </span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              aria-label="Starting Package"
                              type="text"
                              readOnly
                              value={resolveCreatureStartingPackageDisplayName(
                                creaturePropertiesDialog.draft.advancedSettings.startingPackageId,
                                creatureStartingPackageCatalog,
                                creaturePropertiesDialog.draft.advancedSettings.startingPackageId ===
                                  undefined
                                  ? "Unavailable"
                                  : `Row ${creaturePropertiesDialog.draft.advancedSettings
                                    .startingPackageId}`,
                              )}
                            />
                            <button
                              type="button"
                              aria-label="Browse starting package"
                              title="Browse starting package"
                              disabled={!creatureStartingPackageEditable}
                              onClick={() =>
                                setActiveResourcePicker((current) =>
                                  current === "startingpackage" ? null : "startingpackage"
                                )
                              }
                            >
                              ...
                            </button>
                          </div>
                          {activeResourcePicker === "startingpackage" &&
                          creatureStartingPackageEditable && creatureStartingPackageCatalog ? (
                            <>
                              <select
                                aria-label="Creature Starting Package"
                                value={creaturePropertiesDialog.draft.advancedSettings
                                  .startingPackageId ?? ""}
                                onChange={(event) => {
                                  const rowIndex = Number(event.target.value);
                                  if (Number.isSafeInteger(rowIndex)) {
                                    updateCreatureAdvancedField("startingPackageId", rowIndex);
                                    setActiveResourcePicker(null);
                                  }
                                }}
                              >
                                {creatureStartingPackageCatalog.items.map((item) => (
                                  <option key={item.rowIndex} value={item.rowIndex}>
                                    {item.displayName} [{item.rowIndex}]
                                  </option>
                                ))}
                              </select>
                              <form
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  onCreatureStartingPackageSearch?.(startingPackageQuery);
                                }}
                              >
                                <input
                                  aria-label="Search Creature Starting Package rows"
                                  value={startingPackageQuery}
                                  maxLength={128}
                                  onChange={(event) =>
                                    setStartingPackageQuery(event.target.value)}
                                />
                                <button
                                  type="submit"
                                  disabled={!onCreatureStartingPackageSearch}
                                >
                                  Search starting packages
                                </button>
                              </form>
                            </>
                          ) : null}
                          {hasEditableStartingPackageProvenance &&
                          creatureStartingPackageCatalogStatus === "loading" ? (
                            <span role="status">Loading Creature StartingPackage rows</span>
                          ) : null}
                          {hasEditableStartingPackageProvenance &&
                          creatureStartingPackageCatalogStatus === "error" ? (
                            <span role="alert">
                              {creatureStartingPackageCatalogError ??
                                "Creature StartingPackage rows are unavailable."}
                            </span>
                          ) : null}
                          {!hasEditableStartingPackageProvenance ? (
                            <span>
                              Exact StartingPackage Byte/ClassList/catalog provenance is unavailable.
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <label className="canvas-placeable-properties-toggle">
                          <input
                            type="checkbox"
                            checked={creaturePropertiesDialog.draft.advancedSettings
                              .startingPackage}
                            onChange={(event) =>
                              updateCreatureAdvancedField("startingPackage", event.target.checked)
                            }
                          />
                          Starting Package
                        </label>
                      )}
                    </div>
                  </fieldset>

                  <fieldset className="canvas-placeable-properties-group">
                    <div className="canvas-placeable-properties-dual-fields">
                      <label className="canvas-placeable-properties-field-row">
                        <span>Treasure Model</span>
                        <div className="canvas-placeable-properties-field-control">
                          <select
                            value={currentTreasureModelRow ?? ""}
                            disabled={!creatureBodyBagEditable}
                            onChange={(event) => {
                              const nextRow = Number.parseInt(event.target.value, 10);
                              if (Number.isSafeInteger(nextRow) &&
                                creatureBodyBagCatalog?.rows[nextRow]?.rowIndex === nextRow) {
                                updateCreatureAdvancedField("treasureModelRow", nextRow);
                              }
                            }}
                          >
                            {currentTreasureModelRow === undefined ? (
                              <option value="">Preserve existing value</option>
                            ) : null}
                            {(creatureBodyBagCatalog?.rows ?? []).map((row) => (
                              <option key={row.rowIndex} value={row.rowIndex}>
                                {row.displayName}
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
                            min={CREATURE_DECAY_MIN_SECONDS}
                            max={CREATURE_DECAY_MAX_SECONDS}
                            disabled={!creatureDecayTimeEditable}
                            value={
                              creaturePropertiesDialog.draft.advancedSettings
                                .corpseDecayTimeSeconds ?? ""
                            }
                            onChange={(event) => {
                              const nextSeconds = Number.parseInt(event.target.value, 10);
                              if (creatureDecaySecondsToMilliseconds(nextSeconds) !== undefined) {
                                updateCreatureAdvancedField(
                                  "corpseDecayTimeSeconds",
                                  nextSeconds,
                                );
                              }
                            }}
                          />
                        </div>
                      </label>
                    </div>

                    <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                      <legend>Faction</legend>
                      <p className="canvas-creature-properties-cell-value">
                        FactionID: {creatureFactionEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                      </p>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Faction</span>
                        <div className="canvas-placeable-properties-field-control">
                          {creatureFactionEditable ? (
                            <select
                              aria-label="Faction"
                              value={currentFactionId}
                              onChange={(event) =>
                                updateCreatureAdvancedField(
                                  "factionId",
                                  Number.parseInt(event.target.value, 10),
                                )
                              }
                            >
                              {creatureFactionCatalog!.rows.map((row) => (
                                <option key={row.factionId} value={row.factionId}>
                                  {row.factionId} — {row.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              aria-label="Faction"
                              type="text"
                              value={creaturePropertiesDialog.draft.advancedSettings.faction}
                              disabled
                              readOnly
                            />
                          )}
                          <button type="button" disabled>
                            Edit Factions
                          </button>
                        </div>
                      </label>
                    </fieldset>

                    <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                      <legend>Special</legend>
                      <p className="canvas-creature-properties-cell-value">
                        Subrace: {creatureSubraceEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"};{" "}
                        Deity: {creatureDeityEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                      </p>
                      <div className="canvas-placeable-properties-dual-fields">
                        <label className="canvas-placeable-properties-field-row">
                          <span>Subrace</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              disabled={!creatureSubraceEditable}
                              maxLength={CREATURE_SPECIAL_IDENTITY_STRING_MAX_CODE_UNITS}
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
                              disabled={!creatureDeityEditable}
                              maxLength={CREATURE_SPECIAL_IDENTITY_STRING_MAX_CODE_UNITS}
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
                          <span>Adjustment: PRESERVE_ONLY</span>
                          <div className="canvas-placeable-properties-field-control is-narrow">
                            <input
                              aria-label="Challenge Rating Adjustment"
                              type="number"
                              step="1"
                              disabled
                              value={
                                creaturePropertiesDialog.draft.advancedSettings
                                  .challengeRatingAdjustment
                              }
                            />
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>
                            Challenge Rating: {hasEditableChallengeRatingProvenance
                              ? "ACTIVE_NOW"
                              : "PRESERVE_ONLY"}
                          </span>
                          <div className="canvas-placeable-properties-field-control is-narrow">
                            <input
                              aria-label="Challenge Rating"
                              type="number"
                              step="0.1"
                              min={0}
                              max={1000}
                              disabled={!hasEditableChallengeRatingProvenance}
                              value={creaturePropertiesDialog.draft.challengeRating}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField(
                                  "challengeRating",
                                  Number.parseFloat(event.target.value)
                                )
                              }
                            />
                          </div>
                        </label>
                      </fieldset>

                      <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                        <legend>Sound / Perception</legend>
                        <label className="canvas-placeable-properties-field-row">
                          <span>
                            Sound Set: {retainedCreature
                              ? creatureSoundSetEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"
                              : "ACTIVE_NOW"}
                          </span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              aria-label="Sound Set"
                              type="text"
                              readOnly
                              value={creaturePropertiesDialog.draft.advancedSettings.soundSet}
                            />
                            <button
                              type="button"
                              aria-label="Browse sound set"
                              title="Browse sound set"
                              disabled={retainedCreature && !creatureSoundSetEditable}
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
                        {activeResourcePicker === "soundset" && retainedCreature &&
                        creatureSoundSetEditable && creatureSoundSetCatalog ? (
                          <>
                            <select
                              aria-label="Creature Sound Set"
                              value={creaturePropertiesDialog.draft.advancedSettings
                                .soundSetFile ?? ""}
                              onChange={(event) => {
                                const rowIndex = Number(event.target.value);
                                if (Number.isSafeInteger(rowIndex)) {
                                  updateCreatureAdvancedField("soundSetFile", rowIndex);
                                  setActiveResourcePicker(null);
                                }
                              }}
                            >
                              {creatureSoundSetCatalog.items.map((item) => (
                                <option key={item.rowIndex} value={item.rowIndex}>
                                  {item.displayName} [{item.rowIndex}] ({item.resRef})
                                </option>
                              ))}
                            </select>
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                onCreatureSoundSetSearch?.(soundSetQuery);
                              }}
                            >
                              <input
                                aria-label="Search Creature Sound Set rows"
                                value={soundSetQuery}
                                maxLength={128}
                                onChange={(event) => setSoundSetQuery(event.target.value)}
                              />
                              <button
                                type="submit"
                                disabled={!onCreatureSoundSetSearch}
                              >
                                Search
                              </button>
                            </form>
                          </>
                        ) : activeResourcePicker === "soundset" && !retainedCreature ? (
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
                        {hasEditableSoundSetProvenance &&
                        creatureSoundSetCatalogStatus === "loading" ? (
                          <span role="status">Loading Creature SoundSetFile rows</span>
                        ) : null}
                        {hasEditableSoundSetProvenance &&
                        creatureSoundSetCatalogStatus === "error" ? (
                          <span role="alert">
                            {creatureSoundSetCatalogError ??
                              "Creature SoundSetFile rows are unavailable."}
                          </span>
                        ) : null}
                        {retainedCreature && !hasEditableSoundSetProvenance ? (
                          <span>Exact SoundSetFile Word/catalog provenance is unavailable.</span>
                        ) : null}
                        <label className="canvas-placeable-properties-field-row">
                          <span>Perception Range</span>
                          <div className="canvas-placeable-properties-field-control">
                            {creaturePerceptionRangeEditable &&
                            creaturePerceptionRangeCatalog ? (
                              <>
                                <select
                                  aria-label="Creature Perception Range"
                                  value={creaturePropertiesDialog.draft.advancedSettings
                                    .perceptionRangeId ?? ""}
                                  onChange={(event) => {
                                    const rowIndex = Number(event.target.value);
                                    if ([8, 9, 10, 11].includes(rowIndex)) {
                                      updateCreatureAdvancedField(
                                        "perceptionRangeId",
                                        rowIndex,
                                      );
                                    }
                                  }}
                                >
                                  {creaturePerceptionRangeCatalog.items.map((item) => (
                                    <option key={item.rowIndex} value={item.rowIndex}>
                                      {item.rowIndex} — {item.displayName}
                                    </option>
                                  ))}
                                </select>
                                <form onSubmit={(event) => {
                                  event.preventDefault();
                                  onCreaturePerceptionRangeSearch?.(perceptionRangeQuery);
                                }}>
                                  <input
                                    aria-label="Creature Perception Range Search"
                                    type="search"
                                    maxLength={128}
                                    value={perceptionRangeQuery}
                                    onChange={(event) =>
                                      setPerceptionRangeQuery(event.target.value)}
                                  />
                                  <button
                                    type="submit"
                                    aria-label="Search Creature Perception Range rows"
                                    disabled={!onCreaturePerceptionRangeSearch}
                                  >
                                    Search
                                  </button>
                                </form>
                                <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                              </>
                            ) : (
                              <>
                                <input
                                  aria-label="Creature Perception Range"
                                  type="text"
                                  disabled
                                  readOnly
                                  value={creaturePropertiesDialog.draft.advancedSettings
                                    .perceptionRangeId ?? creaturePropertiesDialog.draft
                                      .advancedSettings.perceptionRange}
                                />
                                <span className="canvas-accessibility-hidden">PRESERVE_ONLY</span>
                                {hasEditablePerceptionRangeProvenance &&
                                creaturePerceptionRangeCatalogStatus === "loading" ? (
                                  <span role="status">
                                    Loading Creature PerceptionRange rows
                                  </span>
                                ) : null}
                                {hasEditablePerceptionRangeProvenance &&
                                creaturePerceptionRangeCatalogStatus === "error" ? (
                                  <span role="alert">
                                    {creaturePerceptionRangeCatalogError ??
                                      "Creature PerceptionRange rows are unavailable."}
                                  </span>
                                ) : null}
                              </>
                            )}
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
                        <p className="canvas-creature-properties-cell-value">
                          VarTable: {creatureVariablesEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                        </p>
                        {retainedCreature && !creatureVariablesEditable ? (
                          <span>
                            The retained Creature does not have one exact editable VarTable profile.
                          </span>
                        ) : null}
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
                                    disabled={!creatureVariablesEditable}
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
                                    disabled={!creatureVariablesEditable}
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
                                      disabled={!creatureVariablesEditable}
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
                                      disabled={!creatureVariablesEditable}
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
                                    aria-label={`Move variable ${index + 1} up`}
                                    disabled={!creatureVariablesEditable || index === 0}
                                    onClick={() => moveCreatureVariable(index, "up")}
                                  >
                                    Up
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Move variable ${index + 1} down`}
                                    disabled={!creatureVariablesEditable ||
                                      index === creaturePropertiesDialog.draft.variables.length - 1}
                                    onClick={() => moveCreatureVariable(index, "down")}
                                  >
                                    Down
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Remove variable ${index + 1}`}
                                    disabled={!creatureVariablesEditable}
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
                          <button
                            type="button"
                            disabled={!creatureVariablesEditable}
                            onClick={addCreatureVariable}
                          >
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
                  <p className="canvas-creature-properties-cell-value">
                    FeatList: {creatureFeatListEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </p>
                  {retainedCreature && creatureFeatCatalogStatus === "loading" ? (
                    <span>Loading authoritative feat.2da rows...</span>
                  ) : null}
                  {retainedCreature && creatureFeatCatalogStatus === "error" ? (
                    <span role="alert">
                      {creatureFeatCatalogError ?? "Creature FeatList rows are unavailable."}
                    </span>
                  ) : null}
                  {retainedCreature && !creatureFeatListProvenance ? (
                    <span>Exact FeatList Word-vector/catalog provenance is unavailable.</span>
                  ) : null}
                  {retainedCreature && creatureFeatListEditable &&
                    creatureFeatsSource.some((entry) =>
                      entry.assigned && entry.type === "ToolsCategory 4") ? (
                    <span>
                      Assigned ToolsCategory 4 feats are preserve-only because removal requires
                      destructive spell-variant coupling.
                    </span>
                  ) : null}
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
                        <tr key={`feat_${entry.featId ?? index + 1}_${entry.name}`}>
                          <td>{formatOptionalNumber(entry.featId)}</td>
                          <td>{entry.name}</td>
                          <td>{entry.type}</td>
                          <td>
                            <input
                              type="checkbox"
                              checked={entry.assigned}
                              disabled={!creatureFeatListEditable ||
                                typeof entry.featId !== "number" ||
                                (retainedCreature && entry.assigned &&
                                  entry.type === "ToolsCategory 4")}
                              onChange={(event) => {
                                if (typeof entry.featId === "number") {
                                  updateCreatureFeatAssigned(entry.featId, event.target.checked);
                                }
                              }}
                            />
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
                          {creatureFeatFilterOptions.map((option) => (
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
                  <p className="canvas-creature-properties-cell-value">
                    Class spell-list clear: {creatureClassSpellClearEditable
                      ? "ACTIVE_NOW"
                      : "PRESERVE_ONLY"}
                  </p>
                  <p className="canvas-creature-properties-cell-value">
                    Exact spell-entry removal: {creatureClassSpellRemovalEditable
                      ? "ACTIVE_NOW"
                      : "PRESERVE_ONLY"}
                  </p>
                  <p className="canvas-creature-properties-cell-value">
                    Exact spell-entry order: {creatureClassSpellReorderEditable
                      ? "ACTIVE_NOW"
                      : "PRESERVE_ONLY"}
                  </p>
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
                  {creatureClassSpellRemovalEditable ? (
                    <table className="canvas-creature-properties-table">
                      <thead>
                        <tr>
                          <th scope="col">Source List</th>
                          <th scope="col">Spell ID</th>
                          <th scope="col">MetaMagic</th>
                          <th scope="col">Flags</th>
                          <th scope="col">Opaque Fields</th>
                          <th scope="col">Removal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleClassSpellRemovalEntries.map((entry) => {
                          const key = classSpellRemovalTargetKey(entry.target);
                          const staged = stagedClassSpellRemovalKeys.has(key);
                          return (
                            <tr key={`source_spell_${key}`}>
                              <td>{entry.target.listKind} L{entry.target.spellLevel}</td>
                              <td>{entry.spellId}</td>
                              <td>{entry.spellMetaMagic}</td>
                              <td>{entry.spellFlags}</td>
                              <td>{entry.opaqueSiblingFieldCount}</td>
                              <td>
                                <button
                                  type="button"
                                  disabled={!staged && (
                                    !creaturePropertiesDialog.draft.classSpellRemovalConfirmed ||
                                    creaturePropertiesDialog.draft.classSpellClearSlotIndices.length > 0 ||
                                    creaturePropertiesDialog.draft.classSpellReorders.length > 0
                                  )}
                                  onClick={() => updateCreaturePropertiesDraftField(
                                    "classSpellRemovalTargets",
                                    staged
                                      ? creaturePropertiesDialog.draft.classSpellRemovalTargets
                                        .filter((target) =>
                                          classSpellRemovalTargetKey(target) !== key)
                                      : [...creaturePropertiesDialog.draft.classSpellRemovalTargets,
                                          entry.target].sort(compareClassSpellRemovalTargets),
                                  )}
                                >
                                  {staged ? "Undo Removal" : "Remove Entry"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : null}
                  <label className="canvas-placeable-properties-toggle">
                    <input
                      aria-label="Confirm class spell entry reorder"
                      type="checkbox"
                      checked={creaturePropertiesDialog.draft.classSpellReorderConfirmed}
                      disabled={!creatureClassSpellReorderEditable ||
                        creaturePropertiesDialog.draft.classSpellClearSlotIndices.length > 0 ||
                        creaturePropertiesDialog.draft.classSpellRemovalTargets.length > 0}
                      onChange={(event) => updateCreaturePropertiesDraftField(
                        "classSpellReorderConfirmed",
                        event.target.checked,
                      )}
                    />
                    Confirm exact same-list spell-entry order changes
                  </label>
                  {creatureClassSpellReorderEditable && visibleClassSpellReorderLists.length > 0 ? (
                    <table className="canvas-creature-properties-table">
                      <thead>
                        <tr>
                          <th scope="col">Source List</th>
                          <th scope="col">Order</th>
                          <th scope="col">Spell ID</th>
                          <th scope="col">MetaMagic</th>
                          <th scope="col">Flags</th>
                          <th scope="col">Move</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleClassSpellReorderLists.flatMap((list) => {
                          const staged = creaturePropertiesDialog.draft.classSpellReorders.find(
                            (candidate) => classSpellReorderKey(candidate) ===
                              classSpellReorderKey(list),
                          );
                          const entryOrder = staged?.entryOrder ??
                            list.entries.map((_entry, index) => index);
                          return entryOrder.map((sourceIndex, displayIndex) => {
                            const entry = list.entries[sourceIndex]!;
                            const listLabel = `${list.listKind} L${list.spellLevel}`;
                            return (
                              <tr key={`source_spell_order_${classSpellReorderKey(list)}_${sourceIndex}`}>
                                <td>{listLabel}</td>
                                <td>{displayIndex + 1}</td>
                                <td>{entry.spellId}</td>
                                <td>{entry.spellMetaMagic}</td>
                                <td>{entry.spellFlags}</td>
                                <td>
                                  <button
                                    type="button"
                                    aria-label={`Move spell ${entry.spellId} up in ${listLabel}`}
                                    disabled={!creaturePropertiesDialog.draft.classSpellReorderConfirmed ||
                                      creaturePropertiesDialog.draft.classSpellClearSlotIndices.length > 0 ||
                                      creaturePropertiesDialog.draft.classSpellRemovalTargets.length > 0 ||
                                      displayIndex === 0}
                                    onClick={() => updateCreaturePropertiesDraftField(
                                      "classSpellReorders",
                                      stageCreatureClassSpellEntryMove(
                                        creaturePropertiesDialog.draft.classSpellReorders,
                                        list,
                                        displayIndex,
                                        "up",
                                      ),
                                    )}
                                  >
                                    Move Up
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Move spell ${entry.spellId} down in ${listLabel}`}
                                    disabled={!creaturePropertiesDialog.draft.classSpellReorderConfirmed ||
                                      creaturePropertiesDialog.draft.classSpellClearSlotIndices.length > 0 ||
                                      creaturePropertiesDialog.draft.classSpellRemovalTargets.length > 0 ||
                                      displayIndex === entryOrder.length - 1}
                                    onClick={() => updateCreaturePropertiesDraftField(
                                      "classSpellReorders",
                                      stageCreatureClassSpellEntryMove(
                                        creaturePropertiesDialog.draft.classSpellReorders,
                                        list,
                                        displayIndex,
                                        "down",
                                      ),
                                    )}
                                  >
                                    Move Down
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  ) : null}
                  {creaturePropertiesDialog.draft.classSpellReorders.length > 0 ? (
                    <p className="canvas-creature-properties-cell-value">
                      {creaturePropertiesDialog.draft.classSpellReorders.length} native spell
                      {creaturePropertiesDialog.draft.classSpellReorders.length === 1
                        ? " list" : " lists"} staged for reorder.
                    </p>
                  ) : null}
                  <label className="canvas-placeable-properties-toggle">
                    <input
                      aria-label="Confirm class spell entry removal"
                      type="checkbox"
                      checked={creaturePropertiesDialog.draft.classSpellRemovalConfirmed}
                      disabled={!creatureClassSpellRemovalEditable ||
                        creaturePropertiesDialog.draft.classSpellClearSlotIndices.length > 0 ||
                        creaturePropertiesDialog.draft.classSpellReorders.length > 0}
                      onChange={(event) => updateCreaturePropertiesDraftField(
                        "classSpellRemovalConfirmed",
                        event.target.checked,
                      )}
                    />
                    Confirm permanent removal of selected exact spell entries
                  </label>
                  {creaturePropertiesDialog.draft.classSpellRemovalTargets.length > 0 ? (
                    <p className="canvas-creature-properties-cell-value">
                      {creaturePropertiesDialog.draft.classSpellRemovalTargets.length} exact spell
                      {creaturePropertiesDialog.draft.classSpellRemovalTargets.length === 1
                        ? " entry" : " entries"} staged for removal.
                    </p>
                  ) : null}
                  <label className="canvas-placeable-properties-toggle">
                    <input
                      aria-label="Confirm class spell list clear"
                      type="checkbox"
                      checked={creaturePropertiesDialog.draft.classSpellClearConfirmed}
                      disabled={!creatureClassSpellClearEditable ||
                        creaturePropertiesDialog.draft.classSpellRemovalTargets.length > 0 ||
                        creaturePropertiesDialog.draft.classSpellReorders.length > 0}
                      onChange={(event) => updateCreaturePropertiesDraftField(
                        "classSpellClearConfirmed",
                        event.target.checked,
                      )}
                    />
                    Confirm permanent removal of the selected class spell list
                  </label>
                  {creatureClassSpellClearSelectedSlotStaged ? (
                    <p className="canvas-creature-properties-cell-value">
                      Clear staged for class slot {creatureSpellsClassFilterIndex + 1}.
                    </p>
                  ) : null}
                  <div className="canvas-placeable-properties-script-actions">
                    <button
                      type="button"
                      disabled={!creatureClassSpellClearSelectedSlotEligible ||
                        !creaturePropertiesDialog.draft.classSpellClearConfirmed ||
                        creaturePropertiesDialog.draft.classSpellRemovalTargets.length > 0 ||
                        creaturePropertiesDialog.draft.classSpellReorders.length > 0 ||
                        creatureClassSpellClearSelectedSlotStaged}
                      onClick={() => updateCreaturePropertiesDraftField(
                        "classSpellClearSlotIndices",
                        [...creaturePropertiesDialog.draft.classSpellClearSlotIndices,
                          creatureSpellsClassFilterIndex].sort((left, right) => left - right),
                      )}
                    >
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
                  <p className="canvas-creature-properties-cell-value">
                    SpecAbilityList: {creatureSpecialAbilityListEditable
                      ? "ACTIVE_NOW"
                      : "PRESERVE_ONLY"}
                  </p>
                  {retainedCreature && creatureSpecialAbilityCatalogStatus === "loading" ? (
                    <span>Loading authoritative spells.2da rows...</span>
                  ) : null}
                  {retainedCreature && creatureSpecialAbilityCatalogStatus === "error" ? (
                    <span role="alert">
                      {creatureSpecialAbilityCatalogError ??
                        "Creature SpecAbilityList rows are unavailable."}
                    </span>
                  ) : null}
                  {retainedCreature && !creatureSpecialAbilityListProvenance ? (
                    <span>Exact SpecAbilityList type-4/catalog provenance is unavailable.</span>
                  ) : null}
                  <table className="canvas-creature-properties-table">
                    <thead>
                      <tr>
                        <th scope="col">Spell ID</th>
                        <th scope="col">Name</th>
                        <th scope="col">Type</th>
                        <th scope="col">Caster Level</th>
                        <th scope="col">Uses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creatureSpecialAbilitiesRows.map((entry, index) => (
                        <tr key={`ability_${entry.spellId ?? index}_${entry.name}`}>
                          <td>{formatOptionalNumber(entry.spellId)}</td>
                          <td>{entry.name}</td>
                          <td>{entry.type}</td>
                          <td>
                            <input
                              aria-label={`Caster level for ${entry.name}`}
                              type="number"
                              min={entry.uses > 0 && entry.type === "Spells" ? 1 : 0}
                              max={15}
                              value={entry.casterLevel}
                              disabled={!creatureSpecialAbilityListEditable ||
                                typeof entry.spellId !== "number" ||
                                entry.type === "Monster Abilities"}
                              onChange={(event) => {
                                if (typeof entry.spellId === "number") {
                                  updateCreatureSpecialAbility(
                                    entry.spellId,
                                    "casterLevel",
                                    Number(event.target.value),
                                  );
                                }
                              }}
                            />
                          </td>
                          <td>
                            <input
                              aria-label={`Uses for ${entry.name}`}
                              type="number"
                              min={0}
                              max={255}
                              value={entry.uses}
                              disabled={!creatureSpecialAbilityListEditable ||
                                typeof entry.spellId !== "number"}
                              onChange={(event) => {
                                if (typeof entry.spellId === "number") {
                                  updateCreatureSpecialAbility(
                                    entry.spellId,
                                    "uses",
                                    Number(event.target.value),
                                  );
                                }
                              }}
                            />
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
                    <p className="canvas-creature-properties-cell-value">
                      ItemList: {creaturePropertiesDialog.draft.inventoryControlState}
                    </p>
                    {creatureInventoryEditable ? (
                      <div className="canvas-creature-properties-section-actions">
                        <button type="button" onClick={addCreatureInventoryItem}>
                          Add nw_cloth022 UTI
                        </button>
                      </div>
                    ) : (
                      <p className="canvas-creature-properties-cell-value">
                        Exact retained Creature provenance is required before this list can be changed.
                      </p>
                    )}
                    <table className="canvas-creature-properties-table">
                      <thead>
                        <tr>
                          <th scope="col">ResRef</th>
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
                            <tr
                              key={`inventory_${index + 1}_${entry.resRef ?? entry.embeddedItem?.templateResRef ?? "item"}`}
                            >
                              <td>
                                <input
                                  type="text"
                                  readOnly
                                  aria-label={`Inventory item ${index + 1} resref`}
                                  value={entry.resRef ?? ""}
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
                                  max={65535}
                                  disabled={!creatureInventoryEditable}
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
                                  max={65535}
                                  disabled={!creatureInventoryEditable}
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
                                      disabled={!creatureInventoryEditable}
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
                                      disabled={!creatureInventoryEditable}
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
                                </div>
                              </td>
                              <td>
                                {creatureInventoryEditable ? (
                                  <div className="canvas-creature-properties-section-actions">
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      aria-label={`Move inventory item ${index + 1} up`}
                                      onClick={() => moveCreatureInventoryItem(index, "up")}
                                    >
                                      Up
                                    </button>
                                    <button
                                      type="button"
                                      disabled={index >= creaturePropertiesDialog.draft.inventoryItems.length - 1}
                                      aria-label={`Move inventory item ${index + 1} down`}
                                      onClick={() => moveCreatureInventoryItem(index, "down")}
                                    >
                                      Down
                                    </button>
                                  <button
                                    type="button"
                                    aria-label={`Remove inventory item ${index + 1}`}
                                    onClick={() => removeCreatureInventoryItem(index)}
                                  >
                                    Remove
                                  </button>
                                  </div>
                                ) : (
                                  <span className="canvas-creature-properties-cell-value">Preserved</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6}>No inventory entries</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </fieldset>

                  <fieldset className="canvas-placeable-properties-group">
                    <legend>Equipped Items</legend>
                    <p className="canvas-creature-properties-cell-value">
                      Equip_ItemList: {creaturePropertiesDialog.draft.equippedItemsControlState}
                    </p>
                    <p className="canvas-creature-properties-cell-value">
                      {creatureEquipmentEditable
                        ? "Retained equipment flags and removal are editable; item identity and slot remain immutable."
                        : "Exact retained Creature provenance is required before this list can be changed."}
                    </p>
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
                            <tr
                              key={`equipped_${index + 1}_${entry.resRef ?? entry.embeddedItem?.templateResRef ?? "item"}`}
                            >
                              <td>
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
                              <td>{formatOptionalText(entry.resRef)}</td>
                              <td>{formatOptionalText(entry.randomResRef)}</td>
                              <td>{formatOptionalText(entry.randomList)}</td>
                              <td>{formatLinkedItemText(entry)}</td>
                              <td>
                                {creatureEquipmentEditable ? (
                                  <div className="canvas-creature-properties-item-flags">
                                    <label>
                                      <input
                                        type="checkbox"
                                        aria-label={`Equipped item ${index + 1} dropable`}
                                        checked={Boolean(entry.dropable)}
                                        onChange={(event) =>
                                          updateCreatureEquipmentItem(
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
                                          updateCreatureEquipmentItem(
                                            index,
                                            "pickpocketable",
                                            event.target.checked
                                          )
                                        }
                                      />
                                      Pick
                                    </label>
                                  </div>
                                ) : (
                                  <>Drop {entry.dropable ? "yes" : "no"}; Pick {entry.pickpocketable ? "yes" : "no"}; Infinite {entry.infinite ? "yes" : "no"}</>
                                )}
                              </td>
                              <td>
                                {creatureEquipmentEditable ? (
                                  <button
                                    type="button"
                                    aria-label={`Remove equipped item ${index + 1}`}
                                    onClick={() => removeCreatureEquipmentItem(index)}
                                  >
                                    Remove
                                  </button>
                                ) : (
                                  <span className="canvas-creature-properties-cell-value">Preserved</span>
                                )}
                              </td>
                            </tr>
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
                <div>
                  <p>
                    Comments: {creatureEditorCommentEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </p>
                  <SharedLongTextPropertySection
                    sectionClassName="canvas-placeable-properties-group"
                    legend="Comments"
                    label="Comments"
                    value={creaturePropertiesDialog.draft.comments}
                    disabled={!creatureEditorCommentEditable}
                    maxLength={CREATURE_EDITOR_COMMENT_MAX_CODE_UNITS}
                    onChange={(nextValue) =>
                      updateCreaturePropertiesDraftField("comments", nextValue)
                    }
                    rows={10}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <SharedDialogActionsFooter
            className="canvas-placeable-properties-actions"
            onApply={() => applyCreaturePropertiesDraft(false)}
            onOk={() => applyCreaturePropertiesDraft(true)}
            onCancel={() => cancelCreaturePropertiesDialog()}
            applyDisabled={!creatureClassApplyReady}
            okDisabled={!creatureClassApplyReady}
          />
      </>
    </SharedPropertyDialogChrome>
  );
}
