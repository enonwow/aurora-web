import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type SetStateAction,
  type WheelEvent
} from "react";
import * as THREE from "three";
import type {
  WorkspaceCommandSignal,
  WorkspaceToolbarState
} from "../application/workspaceChromeFacade";
import type {
  AreaScene,
  AuroraAreaEditingTool,
  SceneHistoryState,
  SceneObject,
  SceneObjectKind,
  TerrainBrushKind
} from "../contracts";
import { browserTelemetryFacade } from "../../telemetry/composition/browserTelemetrySingleton";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import type { SceneObjectEncounterCreatureListBlueprintTargetEntry } from
  "../../scene/contracts";
import { AREA_STORE_COMMERCE_FIELDS } from "../../scene/domain/storeCommerce";
import { AREA_STORE_SCRIPT_RESREF_FIELDS } from "../../scene/domain/storeScriptResRefs";
import type { ClientAssetCachePort } from "../../shared/application/clientAssetCachePort";
import { installClientAssetCachedFetch } from "../../shared/application/clientAssetCachedFetch";
import type { AreaLifecycleFacade } from "../../areas/application/areaLifecycleFacade";
import type { AreaTileProductionCertificationSource } from "../../areas/application/areaTileProductionPlacementAdmission";
import type { AreaDraftSessionRegistry } from "../../areas/ports/areaLifecyclePort";
import type { AreaWorkspaceDraftDocument } from "../../areas/areaWorkspaceDraftContracts";
import {
  formatAreaWorkspaceDraftStatus,
  type AreaWorkspaceDraftStatusEvent,
  type AreaWorkspaceStatusEvent
} from "../../areas/application/areaWorkspaceStatus";
import type { ViewportFacade } from "../application/viewportFacade";
import { buildCanvasGridSegments, MASTER_CELLS_PER_TILE } from "../canvasGrid";
import type { WorkspaceOptionSettings } from "../application/layoutPreferencesFacade";
import { isContextMenuGesture, isCtrlPanGesture } from "../viewportPointerPolicy";
import { resolveAxesHelperTransform } from "../axesHelperFacade";
import {
  isVisualTransformGizmoMode,
  resolveGizmoModeBadge,
  resolveVisualTransformSelectionBlockedReason
} from "../visualTransformGizmoRules";
import { WorkspaceContextMenu } from "./WorkspaceContextMenu";
import { AdjustLocationDialog } from "./properties/AdjustLocationDialog";
import { AreaObjectPolygonDialog } from "./properties/AreaObjectPolygonDialog";
import { CreaturePropertiesDialog } from "./properties/CreaturePropertiesDialog";
import { DoorPropertiesDialog } from "./properties/DoorPropertiesDialog";
import { ItemPropertiesDialog } from "./properties/ItemPropertiesDialog";
import { PlaceablePropertiesDialog } from "./properties/PlaceablePropertiesDialog";
import { SoundPropertiesDialog } from "./properties/SoundPropertiesDialog";
import { StorePropertiesDialog } from "./properties/StorePropertiesDialog";
import { WaypointPropertiesDialog } from "./properties/WaypointPropertiesDialog";
import {
  DEFAULT_PROPERTY_DIALOG_DRAG_STATE,
  usePropertyDialogDrag,
  type PropertyDialogDragState
} from "./usePropertyDialogDrag";
import { rebuildChunkBounds } from "../adapters/three/workspaceChunkBounds";
import { rebuildGizmoOverlay } from "../adapters/three/workspaceGizmoOverlay";
import { rebuildGridLayer } from "../adapters/three/workspaceGridLayer";
import {
  AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT,
  rebuildObjectMeshes,
  updateObjectMeshSelectionState,
  writePlaceableTwoDaLightRenderDiagnostics,
  writeSoundRenderDiagnostics
} from "../adapters/three/workspaceObjectMeshLayer";
import { writeAuroraScenePointLightDiagnostics } from "../adapters/three/workspaceSceneLightDiagnostics";
import { advanceAuroraWorldTimerRuntime } from "../adapters/three/auroraWorldTimerRuntime";
import {
  AREA_TERRAIN_TILE_MODEL_RUNTIME_SNAPSHOT_EVENT,
  clearTerrainMesh,
  rebuildTerrainMesh,
  resolveTerrainScenePackageReadiness,
  resolveTerrainRenderStatus,
  type AreaTerrainTileModelRuntimeSnapshot
} from "../adapters/three/workspaceTerrainMesh";
import {
  clearAreaTilePlacementPreviewOverlay,
  syncAreaTilePlacementPreviewOverlay
} from "../adapters/three/workspaceAreaTilePlacementPreview";
import {
  PLACEABLE_MODEL_STATUS_EVENT
} from "../adapters/three/workspacePlaceableModelPresentation";
import {
  applyOrbitPointerBindings,
  applyPlaceableAssetRequestHeaders,
  applyTopDownOracleCameraLock,
  centerCameraForRuntimeObjectPreview,
  centerCameraForScene,
  createRuntime,
  disposeRuntime,
  focusCameraOnPoint,
  refitFocusedPerspectiveCameraForVisibleTerrain,
  refitTopDownOracleCameraForVisibleTerrain,
  renderRuntime,
  resizeRuntime,
  sampleRuntimeObjectAnimationAtTime,
  setTopDownOracleCameraForScene,
  updateRuntimeObjectAnimationPlaybacks,
  type PlaceableAssetRequestHeaderRuntime,
  type RuntimeState
} from "../adapters/three/workspaceThreeRuntime";
import {
  workspaceThreeAnchoredOverlayRuntimePort,
  workspaceThreeCameraRuntimePort,
  workspaceThreeObjectAddRuntimePort,
  workspaceThreePointerRuntimePort,
  workspaceThreeSoundListenerRuntimePort,
  workspaceThreeTransformRuntimePort,
  type ThreeCameraBookmark
} from "../adapters/three/workspaceRenderRuntimePorts";
import {
  CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX,
  CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX,
  CONTEXT_MENU_FALLBACK_HEIGHT_PX,
  CONTEXT_MENU_FALLBACK_WIDTH_PX
} from "../workspaceAnchoredOverlay";
import {
  resolveAnchoredContextMenuPosition,
  resolveContextMenuAnchorScreen
} from "../adapters/three/workspaceViewportProjection";
import {
  resolveBackendDeliveryOriginFromConfig,
  resolveUnsupportedModelCandidateReason
} from "../../placeables/application/placeableRenderAssetResolver";
import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import type { PlaceableApiPort } from "../../placeables/ports/placeableApiPort";
import type { WaypointApiPort } from "../../waypoints/ports/waypointApiPort";
import type { CreatureViewportRenderPayload } from "../../creatures/application/creatureRenderPayloadResolver";
import type { CreatureApiResourceOption } from "../../creatures/contracts";
import {
  clearPlaceableModelLoadQueue,
  clearPlaceableTextureLoadQueue,
  PLACEABLE_ASSET_CACHE_MISS_EVENT,
  PLACEABLE_MODEL_LOAD_QUEUE_PROGRESS_EVENT,
  type PlaceableAssetCacheMissEventDetail,
  type PlaceableModelLoadQueueProgressDetail
} from "../../placeables/adapters/three/placeableThreeAssetLoader";
import type { AreaTileProcessContractReadiness } from "../../tiles/application/areaTileProcessContractReadiness";
import {
  clampSoundHourIndex,
  deriveMaxVolumeDistanceFromCutoff,
  encodeSoundHourMask,
  parseSoundHourMask,
  parseSoundNumericInput,
  resolveSoundHourBounds,
  buildSoundPropertiesDraft,
  applySoundPropertiesDraftToScene,
  buildPlaceablePropertiesDraft,
  buildDoorPropertiesDraft,
  buildCreaturePropertiesDraft,
  buildItemPropertiesDraft,
  areSoundPropertiesDraftsEqual,
  arePlaceablePropertiesDraftsEqual,
  areDoorPropertiesDraftsEqual,
  areCreaturePropertiesDraftsEqual,
  areItemPropertiesDraftsEqual,
  CREATURE_FEAT_FILTER_OPTIONS,
  CREATURE_METAMAGIC_FILTER_OPTIONS,
  CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS,
  CREATURE_SPELL_LEVEL_FILTER_OPTIONS,
  DOOR_APPEARANCE_TYPE_OPTIONS,
  DOOR_GENERIC_APPEARANCE_OPTIONS,
  arePlaceableAdvancedSettingsEqual,
  arePlaceableLockSettingsEqual,
  arePlaceableScriptSlotsEqual,
  arePlaceableTrapSettingsEqual,
  stableJsonStringify,
  type CreaturePropertiesDialogState,
  type CreaturePropertiesDraft,
  type CreaturePropertiesTab,
  type CreatureScriptSlotKey,
  type DoorPropertiesDialogState,
  type DoorPropertiesDraft,
  type DoorPropertiesTab,
  type ItemPropertiesDialogState,
  type ItemPropertiesDraft,
  type ItemPropertiesTab,
  type DoorScriptSlotKey,
  type PlaceablePropertiesDialogState,
  type PlaceablePropertiesDraft,
  type PlaceablePropertiesTab,
  type PlaceableScriptSlotKey,
  type SoundDayNight,
  type SoundPositioningMode,
  type SoundPropertiesDialogState,
  type SoundPropertiesDraft,
  type SoundPropertiesTab,
  type SoundWhenToPlay
} from "../application/workspaceObjectPropertyDrafts";
import {
  materializeExistingDoorTransitionPayload,
  readExistingDoorTransitionStorageProvenance,
} from "../application/doorTransitionStorageProvenance";
import {
  canEditExistingPlaceableScriptSlot,
  materializeExistingPlaceableScriptSlots
} from "../application/placeableScriptProvenance";
import {
  canEditExistingPlaceableTrapScript,
  materializeExistingPlaceableTrapSettings
} from "../application/placeableTrapScriptProvenance";
import {
  isPlaceableTrapByteField,
  materializeExistingPlaceableTrapByteSettings,
  reduceExistingPlaceableTrapByteField
} from "../application/placeableTrapByteProvenance";
import { canEditExistingPlaceableBoolean } from "../application/placeableBooleanProvenance";
import {
  canEditExistingPlaceableLockField,
  materializeExistingPlaceableLockSettings
} from "../application/placeableLockProvenance";
import {
  appendAdmittedPlaceableInventoryItem,
  canEditExistingPlaceableInventory,
  movePlaceableInventoryDraftItem,
  removePlaceableInventoryDraftItem,
  updatePlaceableInventoryDraftCoordinate
} from "../application/placeableInventoryProvenance";
import {
  appendAdmittedCreatureInventoryItem,
  materializeExistingCreatureInventory,
  moveCreatureInventoryDraftItem,
  removeCreatureInventoryDraftItem,
  updateCreatureInventoryDraftField
} from "../application/creatureInventoryProvenance";
import {
  materializeExistingCreatureEquipment,
  removeCreatureEquipmentDraftItem,
  updateCreatureEquipmentDraftFlag
} from "../application/creatureEquipmentProvenance";
import { materializeExistingCreatureTag } from "../application/creatureTagProvenance";
import {
  materializeExistingCreatureConversation,
  reduceExistingCreatureConversation,
} from "../application/creatureConversationProvenance";
import {
  materializeExistingCreatureNoInterrupt,
  reduceExistingCreatureNoInterrupt,
} from "../application/creatureInterruptableProvenance";
import {
  materializeExistingCreatureAdvancedFlag,
  reduceExistingCreatureAdvancedFlag,
} from "../application/creatureAdvancedFlagsProvenance";
import {
  materializeExistingCreatureBodyBagRow,
  materializeExistingCreatureDecayTimeSeconds,
} from "../application/creatureDeathRemainsProvenance";
import type { CreatureAdvancedFlagKey } from "../../scene/domain/creatureAdvancedFlags";
import {
  materializeExistingCreatureNameLocalizedStrings,
  reduceExistingCreatureNameLocalizedString,
  reduceExistingCreatureNameLocalizedStringEntries,
} from "../application/creatureLocalizedStringProvenance";
import {
  materializeExistingPlaceableDurabilitySaveBytes,
  reduceExistingPlaceableDurabilitySaveByte
} from "../application/placeableDurabilitySaveProvenance";
import {
  materializeExistingPlaceableConversationInterruptable,
  reduceExistingPlaceableConversation,
  reduceExistingPlaceableNoInterrupt
} from "../application/placeableConversationInterruptableProvenance";
import {
  materializeExistingPlaceableAnimationState,
  reduceExistingPlaceableInitialState
} from "../application/placeableAnimationStateProvenance";
import {
  materializeExistingPlaceableComments,
  reduceExistingPlaceableEditorComment
} from "../application/placeableEditorCommentProvenance";
import {
  materializeExistingCreatureComments,
  reduceExistingCreatureEditorComment,
} from "../application/creatureEditorCommentProvenance";
import {
  reduceExistingItemEditorComment,
} from "../application/itemEditorCommentProvenance";
import {
  reduceExistingItemInstanceStateField,
} from "../application/itemInstanceStateProvenance";
import {
  reduceExistingItemTag,
} from "../application/itemTagProvenance";
import {
  reduceExistingItemTemplateResRef,
} from "../application/itemTemplateResRefProvenance";
import {
  reduceExistingItemLocalizedString,
  reduceExistingItemLocalizedStringEntries,
} from "../application/itemLocalizedStringProvenance";
import {
  appendItemVariable as appendEditableItemVariable,
  moveItemVariable as moveEditableItemVariable,
  removeItemVariable as removeEditableItemVariable,
  updateItemVariable as updateEditableItemVariable,
} from "../application/itemVariableProvenance";
import {
  appendExistingItemProperty,
  moveExistingItemProperty,
  removeExistingItemProperty,
  updateExistingItemPropertyField,
} from "../application/itemPropertyListProvenance";
import {
  appendExistingItemInventoryBlueprintEntry,
  appendWizardItemEquipmentEntry,
  appendWizardItemInventoryEntry,
  listExistingItemInventoryBlueprintOptions,
  moveExistingItemInventoryEntry,
  moveWizardItemInventoryEntry,
  removeExistingItemInventoryEntry,
  removeWizardItemEquipmentEntry,
  removeWizardItemInventoryEntry,
  updateExistingItemInventoryCoordinate,
  updateWizardItemEquipmentEntry,
  updateWizardItemInventoryEntry,
} from "../application/itemInventoryProvenance";
import { isItemWizardBlueprintEditorObject } from
  "../application/itemBlueprintPropertiesApplyRouting";
import { materializeItemPropertiesDraft } from
  "../application/itemPropertiesDraftMaterialization";
import {
  areStorePropertiesDraftsEqual,
  buildStorePropertiesDraft,
  materializeStorePropertiesDraft,
  type StorePropertiesDraft,
  type StorePropertiesDialogState,
} from "../application/storePropertiesDraft";
import {
  buildWaypointPropertiesDraft,
  materializeWaypointPropertiesDraft,
  type WaypointPropertiesDialogState,
} from "../application/waypointPropertiesDraft";
import { reduceExistingWaypointTag } from
  "../application/waypointTagProvenance";
import { reduceExistingWaypointTemplateResRef } from
  "../application/waypointTemplateResRefProvenance";
import { reduceExistingWaypointLocalizedName } from
  "../application/waypointLocalizedNameProvenance";
import { reduceExistingWaypointDescription } from
  "../application/waypointDescriptionProvenance";
import { reduceExistingWaypointEditorComment } from
  "../application/waypointEditorCommentProvenance";
import { reduceExistingWaypointMapNote } from
  "../application/waypointMapNoteProvenance";
import { reduceExistingWaypointVariables } from
  "../application/waypointVariableProvenance";
import {
  canEditExistingWaypointAppearance,
  loadExistingWaypointAppearanceCatalog,
  reduceExistingWaypointAppearance,
  type ExistingWaypointAppearanceCatalog,
} from "../application/waypointAppearanceProvenance";
import { countChangedStoreInventoryEntries } from
  "../../scene/domain/storeInventory";
import { reduceExistingItemBaseItemDraft } from
  "../application/itemBaseAppearanceProvenance";
import {
  materializePlaceableBasicIdentity,
  reducePlaceableBasicIdentityField
} from "../application/placeableBasicIdentityPreservation";
import { reduceExistingPlaceableTag } from "../application/placeableTagProvenance";
import {
  materializeExistingPlaceableLocalizedStrings,
  reduceExistingPlaceableLocalizedString,
  reduceExistingPlaceableLocalizedStringEntries,
} from "../application/placeableLocalizedStringProvenance";
import {
  loadExistingPlaceableAppearanceCatalog,
  materializeExistingPlaceableAppearance,
  reduceExistingPlaceableAppearance,
  type ExistingPlaceableAppearanceCatalog
} from "../application/placeableAppearanceProvenance";
import {
  loadExistingCreatureAppearanceCatalog,
  materializeExistingCreatureAppearance,
  reduceExistingCreatureAppearance,
  type ExistingCreatureAppearanceCatalog,
} from "../application/creatureAppearanceProvenance";
import {
  loadExistingCreatureGenderCatalog,
  materializeExistingCreatureGender,
  reduceExistingCreatureGender,
  resolveCreatureGenderDisplayName,
  type ExistingCreatureGenderCatalog,
} from "../application/creatureGenderProvenance";
import {
  loadExistingCreatureAppendageCatalog,
  materializeExistingCreatureAppendage,
  reduceExistingCreatureAppendage,
  type ExistingCreatureAppendageCatalog,
} from "../application/creatureAppendageProvenance";
import {
  loadExistingCreaturePerceptionRangeCatalog,
  materializeExistingCreaturePerceptionRange,
  reduceExistingCreaturePerceptionRange,
  resolveCreaturePerceptionRangeDisplayName,
  type ExistingCreaturePerceptionRangeCatalog,
} from "../application/creaturePerceptionRangeProvenance";
import {
  loadExistingCreatureWalkRateCatalog,
  materializeExistingCreatureWalkRate,
  reduceExistingCreatureWalkRate,
  resolveCreatureWalkRateDisplayName,
  type ExistingCreatureWalkRateCatalog,
} from "../application/creatureWalkRateProvenance";
import {
  loadExistingCreatureSoundSetCatalog,
  materializeExistingCreatureSoundSetFile,
  reduceExistingCreatureSoundSetFile,
  resolveCreatureSoundSetDisplayName,
  type ExistingCreatureSoundSetCatalog,
} from "../application/creatureSoundSetProvenance";
import {
  loadExistingCreatureStartingPackageCatalog,
  materializeExistingCreatureStartingPackageId,
  reduceExistingCreatureStartingPackageId,
  type ExistingCreatureStartingPackageCatalog,
} from "../application/creatureStartingPackageProvenance";
import {
  isExistingCreatureClassCatalogAdmitted,
  loadCreatureClassIdentityStartingPackageCatalog,
  loadExistingCreatureClassCatalog,
  materializeExistingCreatureClassIdentity,
  materializeExistingCreatureClassSlotResize,
  readExistingCreatureClassIdentityProvenance,
  reduceExistingCreatureClassIdentityStartingPackageId,
  type ExistingCreatureClassCatalog,
} from "../application/creatureClassIdentityProvenance";
import { materializeExistingCreatureClassSpellClear } from
  "../application/creatureClassSpellClearProvenance";
import {
  filterRemovedCreatureClassSpells,
  materializeExistingCreatureClassSpellRemoval,
  readExistingCreatureClassSpellRemovalProvenance,
  type CreatureClassSpellRemovalTarget,
} from "../application/creatureClassSpellRemovalProvenance";
import {
  applyCreatureClassSpellReorders,
  materializeExistingCreatureClassSpellReorder,
  readExistingCreatureClassSpellReorderProvenance,
  type CreatureClassSpellReorder,
} from "../application/creatureClassSpellReorderProvenance";
import {
  isExistingCreatureSkillCatalogAdmitted,
  loadExistingCreatureSkillCatalog,
  materializeExistingCreatureSkills,
  readExistingCreatureSkillListProvenance,
  type ExistingCreatureSkillCatalog,
} from "../application/creatureSkillListProvenance";
import {
  isExistingCreatureFeatCatalogAdmitted,
  loadExistingCreatureFeatCatalog,
  materializeExistingCreatureFeats,
  readExistingCreatureFeatListProvenance,
  type ExistingCreatureFeatCatalog,
} from "../application/creatureFeatListProvenance";
import {
  isExistingCreatureSpecialAbilityCatalogAdmitted,
  loadExistingCreatureSpecialAbilityCatalog,
  materializeExistingCreatureSpecialAbilities,
  readExistingCreatureSpecialAbilityListProvenance,
  reduceCreatureSpecialAbilityEntry,
  type ExistingCreatureSpecialAbilityCatalog,
} from "../application/creatureSpecialAbilityListProvenance";
import {
  appendExistingCreatureVariable,
  canEditExistingCreatureVariables,
  moveExistingCreatureVariable,
  removeExistingCreatureVariable,
  updateExistingCreatureVariable,
} from "../application/creatureVariableProvenance";
import { readCreatureVariableTargetEntries } from "../../scene/domain/creatureVariableTable";
import {
  loadExistingCreaturePhenotypeCatalog,
  materializeExistingCreaturePhenotype,
  reduceExistingCreaturePhenotype,
  resolveCreaturePhenotypeDisplayName,
  type ExistingCreaturePhenotypeCatalog,
} from "../application/creaturePhenotypeProvenance";
import {
  materializeExistingCreaturePortrait,
  readExistingCreaturePortraitProvenance,
  reduceExistingCreaturePortrait,
} from "../application/creaturePortraitProvenance";
import {
  materializeExistingCreatureChallengeRating,
  reduceExistingCreatureChallengeRating,
} from "../application/creatureChallengeRatingProvenance";
import {
  materializeExistingCreatureAbilityScores,
  reduceExistingCreatureAbilityScore,
} from "../application/creatureAbilityScoresProvenance";
import {
  materializeExistingCreatureAppearanceColors,
  reduceExistingCreatureAppearanceColor,
} from "../application/creatureAppearanceColorsProvenance";
import type { CreatureAppearanceColorKey } from "../../scene/domain/creatureAppearanceColors";
import type { CreatureBodyPartKey } from "../../scene/domain/creatureBodyParts";
import {
  materializeExistingCreatureBodyParts,
  reduceExistingCreatureBodyPart,
} from "../application/creatureBodyPartProvenance";
import {
  materializeExistingCreatureHitPointDraft,
  reduceExistingCreatureHitPointDraft,
} from "../application/creatureHitPointsProvenance";
import {
  canEditExistingCreatureClassLevels,
  materializeExistingCreatureClassEntries,
} from "../application/creatureClassLevelProvenance";
import type { CreatureAbilityScoreKey } from "../../scene/domain/creatureAbilityScores";
import {
  materializeExistingCreatureNaturalArmorClass,
  reduceExistingCreatureNaturalArmorClass,
} from "../application/creatureNaturalArmorClassProvenance";
import {
  materializeExistingCreatureSavingThrowBonuses,
  reduceExistingCreatureSavingThrowBonus,
} from "../application/creatureSavingThrowBonusesProvenance";
import {
  materializeExistingCreatureAlignment,
  reduceExistingCreatureAlignment,
} from "../application/creatureAlignmentProvenance";
import { materializeExistingCreatureFaction } from "../application/creatureFactionProvenance";
import {
  materializeExistingCreatureTemplateResRef,
  reduceExistingCreatureTemplateResRef,
} from "../application/creatureTemplateResRefProvenance";
import {
  materializeExistingCreatureSpecialIdentityStrings,
  reduceExistingCreatureSpecialIdentityString,
} from "../application/creatureSpecialIdentityStringsProvenance";
import {
  materializeExistingCreatureScriptResRefs,
  reduceExistingCreatureScriptResRef,
} from "../application/creatureScriptResRefsProvenance";
import type { CreatureAppearanceCatalogFacade } from "../../creatures/application/creatureAppearanceCatalogFacade";
import type { CreatureGenderCatalogFacade } from "../../creatures/application/creatureGenderCatalogFacade";
import type { CreatureAppendageCatalogFacade } from
  "../../creatures/application/creatureAppendageCatalogFacade";
import type { CreaturePerceptionRangeCatalogFacade } from
  "../../creatures/application/creaturePerceptionRangeCatalogFacade";
import type { CreatureWalkRateCatalogFacade } from
  "../../creatures/application/creatureWalkRateCatalogFacade";
import type { CreatureSoundSetCatalogFacade } from
  "../../creatures/application/creatureSoundSetCatalogFacade";
import type { CreatureStartingPackageCatalogFacade } from
  "../../creatures/application/creatureStartingPackageCatalogFacade";
import type { CreatureClassCatalogFacade } from
  "../../creatures/application/creatureClassCatalogFacade";
import type { CreatureSkillCatalogFacade } from
  "../../creatures/application/creatureSkillCatalogFacade";
import type { CreatureFeatCatalogFacade } from
  "../../creatures/application/creatureFeatCatalogFacade";
import type { CreatureSpecialAbilityCatalogFacade } from
  "../../creatures/application/creatureSpecialAbilityCatalogFacade";
import type { CreaturePhenotypeCatalogFacade } from "../../creatures/application/creaturePhenotypeCatalogFacade";
import {
  materializeExistingPlaceableHitPoints,
  reduceExistingPlaceableHitPoints
} from "../application/placeableHitPointProvenance";
import { materializeExistingPlaceableTrapType } from "../application/placeableTrapTypeProvenance";
import { materializeExistingPlaceableBodyBag } from "../application/placeableBodyBagProvenance";
import { materializeExistingPlaceablePortrait } from "../application/placeablePortraitProvenance";
import { materializeExistingPlaceableFaction } from "../application/placeableFactionProvenance";
import { readExistingEncounterLocalizedName } from
  "../application/encounterLocalizedNameProvenance";
import {
  appendExistingPlaceableVariable,
  materializeExistingPlaceableVariables,
  moveExistingPlaceableVariable,
  removeExistingPlaceableVariable,
  updateExistingPlaceableVariable,
} from "../application/placeableVariableProvenance";
import {
  materializeExistingPlaceableTemplateResRef,
  reduceExistingPlaceableTemplateResRef,
} from "../application/placeableTemplateResRefProvenance";
import { useRuntimeSoundPreview } from "../application/useRuntimeSoundPreview";
import {
  appendAreaObjectPolygonDraftCreature,
  appendAreaObjectPolygonDraftPoint,
  appendAreaObjectPolygonDraftSpawnPoint,
  buildAreaObjectPolygonDraft,
  materializeAreaObjectPolygonDraft,
  materializeAreaObjectPolygonDraftActive,
  materializeAreaObjectPolygonDraftPlayerOnly,
  materializeAreaObjectPolygonDraftReset,
  materializeAreaObjectPolygonDraftResetTime,
  materializeAreaObjectPolygonDraftSpawnOption,
  materializeAreaObjectPolygonDraftRespawns,
  materializeAreaObjectPolygonDraftCreatureCounts,
  materializeAreaObjectPolygonDraftFaction,
  materializeAreaObjectPolygonDraftDifficulty,
  materializeAreaObjectPolygonDraftTemplateResRef,
  materializeAreaObjectPolygonDraftLocalizedName,
  materializeAreaObjectPolygonDraftEditorComment,
  materializeAreaObjectPolygonDraftVariables,
  materializeAreaObjectPolygonDraftCreatureList,
  materializeAreaObjectPolygonDraftSpawnPoints,
  materializeAreaObjectPolygonDraftScriptResRefs,
  materializeAreaObjectPolygonDraftTriggerScriptResRefs,
  materializeAreaObjectPolygonDraftTriggerTransitionStorage,
  materializeAreaObjectPolygonDraftTriggerCoreProperties,
  materializeAreaObjectPolygonDraftTriggerTrapProperties,
  materializeAreaObjectPolygonDraftTag,
  removeAreaObjectPolygonDraftPoint,
  removeAreaObjectPolygonDraftCreature,
  removeAreaObjectPolygonDraftSpawnPoint,
  moveAreaObjectPolygonDraftCreature,
  moveAreaObjectPolygonDraftSpawnPoint,
  replaceAreaObjectPolygonDraftCreature,
  updateAreaObjectPolygonDraftActive,
  updateAreaObjectPolygonDraftPlayerOnly,
  updateAreaObjectPolygonDraftReset,
  updateAreaObjectPolygonDraftResetTime,
  updateAreaObjectPolygonDraftSpawnOption,
  updateAreaObjectPolygonDraftRespawnsFinite,
  updateAreaObjectPolygonDraftRespawnsInfinite,
  updateAreaObjectPolygonDraftMaximumCreatures,
  updateAreaObjectPolygonDraftMinimumCreatures,
  updateAreaObjectPolygonDraftFaction,
  updateAreaObjectPolygonDraftDifficulty,
  updateAreaObjectPolygonDraftTemplateResRef,
  updateAreaObjectPolygonDraftLocalizedName,
  updateAreaObjectPolygonDraftEditorComment,
  updateAreaObjectPolygonDraftVariables,
  updateAreaObjectPolygonDraftCreatureSingleSpawn,
  updateAreaObjectPolygonDraftSpawnPoint,
  updateAreaObjectPolygonDraftScriptResRef,
  updateAreaObjectPolygonDraftTriggerScriptResRef,
  updateAreaObjectPolygonDraftTriggerTransitionStorage,
  updateAreaObjectPolygonDraftTriggerCoreProperties,
  updateAreaObjectPolygonDraftTriggerTrapProperties,
  updateAreaObjectPolygonDraftTag,
  updateAreaObjectPolygonDraftPoint,
  type AreaObjectPolygonDraft,
  type AreaObjectPolygonPointField,
  type AreaObjectPolygonSpawnPointField,
} from "../../areas/application/areaObjectPolygonAuthoring";
import {
  encounterScriptResRefsStoragesEqual,
  type EncounterScriptResRefField,
} from "../../scene/domain/encounterScriptResRefs";
import {
  triggerScriptResRefsStoragesEqual,
  type TriggerScriptResRefField,
} from "../../scene/domain/triggerScriptResRefs";
import {
  triggerTransitionStoragesEqual,
  type TriggerTransitionStorage,
} from "../../scene/domain/triggerTransitionStorage";
import {
  triggerCorePropertiesEqual,
  type TriggerCoreProperties,
} from "../../scene/domain/triggerCoreProperties";
import {
  triggerTrapPropertiesEqual,
  type TriggerTrapProperties,
} from "../../scene/domain/triggerTrapProperties";
import { encounterVariableTargetEntriesEqual } from
  "../../scene/domain/encounterVariableTable";
import { triggerVariableTargetEntriesEqual } from
  "../../scene/domain/triggerVariableTable";
import {
  encounterCreatureListTargetEntriesEqual,
  readEncounterCreatureBlueprintTargetEntry,
} from "../../scene/domain/encounterCreatureSingleSpawn";
import { encounterSpawnPointTargetEntriesEqual } from
  "../../scene/domain/encounterSpawnPointList";
import type { AuroraVariableTargetEntry } from
  "../../shared/domain/auroraVariableTable";
import {
  isAreaSoundResRef,
  MAX_AREA_SOUND_PLAYBACK_LIST_ENTRIES,
  readAreaSoundPlaybackStorage,
} from "../../areas/domain/areaSoundPlaybackStorage";
import { readAreaSoundProfileStorage } from "../../areas/domain/areaSoundProfileStorage";
import type { RuntimeSoundNowPlayingBadge } from "../runtimeSoundPlaybackState";
import { useWorkspaceKeyboardObjectActions } from "../application/useWorkspaceKeyboardObjectActions";
import { useAuroraAreaTileClipboardCommands } from "../application/useAuroraAreaTileClipboardCommands";
import {
  serializeAreaEditingProofFeedback,
  serializeAreaEditingProofHistory,
  serializeAreaEditingProofSelection,
  serializeAreaEditingProofState,
  serializeAreaEditingProofTool,
  serializeAreaEditingProofValue
} from "../application/areaEditingProofDatasets";
import { AuroraAreaCanvasCommands } from "./AuroraAreaCanvasCommands";
import { useWorkspaceObjectCommands } from "../application/useWorkspaceObjectCommands";
import {
  useWorkspacePointerSelection,
  type SelectionBoxState
} from "../application/useWorkspacePointerSelection";
import { canUseAuroraAreaGridPointerDuringAssetLoading } from "../application/workspaceCanvasAssetLoadingPointerGate";
import { cloneSceneObject } from "../application/workspaceSceneObjectClone";
import { useWorkspaceCommandSignal } from "../application/useWorkspaceCommandSignal";
import { useWorkspaceTransformControls } from "../application/useWorkspaceTransformControls";
import {
  resolveContextMenuActionObject,
  useWorkspaceContextMenuActions,
  type ContextMenuState
} from "../application/useWorkspaceContextMenuActions";
import {
  clampWorkspaceDialogPosition,
  resolveAnchoredDialogDragTargetObject,
  useAnchoredContextMenuSync,
  useAnchoredObjectDialogSync,
  type AnchoredDialogPositionState
} from "../application/useWorkspaceDialogLifecycle";
import { useWorkspaceObjectDialogEffects } from "../application/useWorkspaceObjectDialogEffects";
import { useWorkspaceObjectAddDragDrop } from "./useWorkspaceObjectAddDragDrop";
import {
  AREA_PLACEABLE_PLACEHOLDER_REASONS,
  resolvePlaceableModelResolution,
  resolveAreaPlaceablePlaceholderReason,
  resolvePlaceableRenderContractState,
  resolveSceneObjectRenderAppearanceType,
  resolvePlaceableTextureDeliveryUrl,
  resolvePlaceableTextureDeliveryUrlsByReference,
  type AreaPlaceablePlaceholderReason
} from "../application/workspacePlaceableRenderContracts";
import {
  OBJECT_KIND_BY_SCOPE,
  areObjectPlacementsEqual,
  buildAdjustLocationDraft,
  buildAdjustLocationVisualTransformInput,
  filterObjectsByRenderObjectIds,
  filterSelectedObjectIdsForVisibleSelectableObjects,
  fromAdjustLocationCoordinate,
  fromAdjustLocationHeight,
  isKindLocked,
  isObjectSelectableByCatalogScope,
  isObjectSelectableByScope,
  isObjectVisibleWithRenderFilter,
  isObjectVisibleWithRenderFilterState,
  resolveNextAdjustLocationDraftField,
  resolveAdjustLocationVisualTransformMeta,
  resolveObjectRenderStatus,
  resolveObjectAddDropPlacement,
  resolveRenderObjectIdsSet,
  resolveSidebarSelectionIds,
  resolveSceneGridVisibility,
  resolveSceneObjectName,
  resolveSceneObjectRenderScale,
  resolveVisibleSelectedObjects,
  resolveVisibleObjectForSidebarSignal,
  resolveVisibleObjectForPropertiesSignal,
  shouldRenderAreaGeometry,
  toRadians,
  type AdjustLocationDraft,
  type SceneGridVisibility
} from "../application/workspaceSceneInteraction";

export { resolveBackendDeliveryOriginFromConfig, resolveUnsupportedModelCandidateReason };
export { applyPlaceableAssetRequestHeaders };
export {
  resolvePlaceableModelResolution,
  resolvePlaceableTextureDeliveryUrl,
  resolvePlaceableTextureDeliveryUrlsByReference
};
export type { PlaceableAssetRequestHeaderRuntime };

const AREA_SHARED_RENDERER_SNAPSHOT_EVENT =
  "aurora:areas:shared-renderer-snapshot";
const AREA_TILE_PROCESS_RUNTIME_SNAPSHOT_EVENT =
  "aurora:areas:tile-process-runtime-snapshot";
const ITEM_VISUAL_PROOF_REQUEST_EVENT =
  "aurora:items:visual-proof-request";
const ITEM_VISUAL_PROOF_SNAPSHOT_EVENT =
  "aurora:items:visual-proof-snapshot";
const AREA_OBJECT_RUNTIME_DIAGNOSTICS_DEBOUNCE_MS = 300;
export const AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT = 256;
const CAMERA_WHEEL_DISTANCE_EPSILON = 0.001;

function creatureAdvancedFlagForDraftField(
  field: keyof CreaturePropertiesDraft["advancedSettings"],
): CreatureAdvancedFlagKey | undefined {
  switch (field) {
    case "disarmable":
      return "disarmable";
    case "plot":
      return "plot";
    case "immortal":
      return "immortal";
    case "leavesLootableCorpse":
      return "lootable";
    case "noPermanentDeath":
      return "noPermanentDeath";
    default:
      return undefined;
  }
}

function readCreatureHitPointCoupledClassLevels(
  snapshotObject: SceneObject,
  targetEntries: ReadonlyArray<CreaturePropertiesDraft["classEntries"][number]>,
): readonly number[] | undefined {
  const snapshotEntries = snapshotObject.creatureProperties?.classEntries;
  if (!canEditExistingCreatureClassLevels(snapshotObject.source, snapshotEntries) ||
    !snapshotEntries || targetEntries.length < 1 || targetEntries.length > 8) return undefined;
  if (targetEntries.length === snapshotEntries.length) {
    if (targetEntries.some((entry, index) =>
      entry.classId !== snapshotEntries[index]?.classId)) return undefined;
    return targetEntries.map((entry) => entry.level);
  }
  const provenance = readExistingCreatureClassIdentityProvenance(snapshotObject.source);
  const retainedCount = Math.min(targetEntries.length, snapshotEntries.length);
  if (!provenance || snapshotEntries.length !== provenance.sourceClassIds.length ||
    snapshotEntries.some((entry, index) => entry.classId !== provenance.sourceClassIds[index] ||
      entry.level !== provenance.sourceLevels[index]) ||
    targetEntries.some((entry, index) => !Number.isSafeInteger(entry.classId) ||
      Number(entry.classId) < 0 || Number(entry.classId) >= provenance.classesRowCount ||
      !Number.isSafeInteger(entry.level) || entry.level < 1 || entry.level > 60 ||
      (index < retainedCount && (entry.classId !== provenance.sourceClassIds[index] ||
        entry.level !== provenance.sourceLevels[index]))) ||
    new Set(targetEntries.map((entry) => entry.classId)).size !== targetEntries.length ||
    targetEntries.reduce((sum, entry) => sum + entry.level, 0) > 180) return undefined;
  return targetEntries.map((entry) => entry.level);
}

type WorkspaceCanvasDebugState = WorkspaceToolbarState["canvasDebug"];

function resolveAreaOracleCleanCanvasDebugState(
  debugState: WorkspaceCanvasDebugState
): WorkspaceCanvasDebugState {
  return {
    ...debugState,
    bounds: false,
    collisionOverlay: false,
    hiddenMeshes: false,
    objectLabels: false,
    showNonRenderMeshes: false,
    showVtPhysicalAnchor: false,
    statusMap: "off",
    textures: true,
    walkmeshOverlay: false,
    wireframe: false
  };
}

function normalizeAreaOracleRenderPriorityObjectIds(
  value: string | readonly string[] | null | undefined
): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[|,;]/u)
      : [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  rawValues.forEach((rawValue) => {
    const objectId = rawValue.trim();
    if (!objectId || seen.has(objectId)) {
      return;
    }
    seen.add(objectId);
    normalized.push(objectId);
  });
  return normalized;
}

export function resolveAreaOracleRenderPriorityObjectIdsForTests(
  value: string | readonly string[] | null | undefined
): string[] {
  return normalizeAreaOracleRenderPriorityObjectIds(value);
}

function readAreaOracleRenderPriorityObjectIds(runtime: RuntimeState): string[] {
  return normalizeAreaOracleRenderPriorityObjectIds(
    runtime.container.dataset.areaOracleRenderPriorityObjectIds
  );
}

interface AreaSharedRendererRuntimeSnapshot {
  version: "aurora-areas-shared-renderer-runtime/v1";
  path: "shared-placeables-renderer";
  status: "none" | "ready" | "partial" | "blocked";
  placeholderStatus: "none" | "ready" | "partial" | "blocked";
  total: number;
  payloadBoundCount: number;
  modelReadyCount: number;
  uniqueModelUrlCount: number;
  uniqueModelCacheKeyCount: number;
  modelUrlSample: string[];
  modelCacheKeySample: string[];
  primitiveFallbackCount: number;
  primitiveFallbackRenderLimit: number;
  primitiveFallbackSuppressedCount: number;
  placeholderReasonCounts: Record<AreaPlaceablePlaceholderReason, number>;
  placeholderReasonIds: Record<AreaPlaceablePlaceholderReason, string[]>;
  missingPayloadIds: string[];
  payloadMissingModelUrlIds: string[];
  assetContractBlockedIds: string[];
  modelLoadFailedIds: string[];
  modelLoadFailedModelUrls: string[];
  modelLoadFailedModelCacheKeys: string[];
  stillLoadingIds: string[];
  primitiveFallbackIds: string[];
  textureStatusCounts: Record<string, number>;
  texturePendingIds: string[];
  textureIssueIds: string[];
  textureMissingIds: string[];
  textureFallbackIds: string[];
  textureSkippedIds: string[];
  toolsetPhysicalHiddenIds: string[];
  toolsetPhysicalHiddenReasons: string[];
  blockedIds: string[];
  areaRenderFrameMirror: AreaRenderFrameMirrorSnapshot;
  objectVisualTransformRootCount: number;
  objectVisualTransformAppliedCount: number;
  objectVisualTransformAppliedIds: string[];
  objectVisualTransformSample: AreaSharedRendererVisualTransformSampleEntry[];
  visualTransformSample: AreaSharedRendererVisualTransformSampleEntry[];
  modelBoundsSample: AreaSharedRendererModelBoundsSampleEntry[];
}

interface AreaRenderFrameMirrorLayerSnapshot {
  mirror: string | null;
  mirrorWidth: number | null;
  positionX: number;
  scaleX: number;
}

interface AreaRenderFrameMirrorSnapshot {
  status: "coordinate-x" | "disabled" | "partial";
  enabled: boolean;
  objectLayer: AreaRenderFrameMirrorLayerSnapshot;
  boundsLayer: AreaRenderFrameMirrorLayerSnapshot;
}

interface AreaSharedRendererVisualTransformSampleEntry {
  objectId: string;
  objectKind: string;
  rendererPath: string;
  sourceId: string;
  templateId: string;
  payloadStatus: string;
  geometryStatus: string;
  placeholderReason: string;
  visualTransform: string;
  effectiveVisualTransform: string;
  visualTransformApplied: boolean;
  rootPosition: { x: number; y: number; z: number };
  rootRotation: { x: number; y: number; z: number };
  rootScale: { x: number; y: number; z: number };
  renderTransform: AreaSharedRendererModelBoundsSampleEntry["renderTransform"];
}

interface AreaSharedRendererModelBoundsSampleEntry {
  objectId: string;
  sourceId: string;
  templateId: string;
  sourceAppearanceType: number | null;
  sourceGenericType: number | null;
  payloadAppearanceType: number | null;
  payloadModelResRef: string;
  payloadModelGlbUrl: string;
  payloadStatus: string;
  modelUrl: string;
  modelCacheKey: string;
  bounds: string;
  maxAxis: number;
  worldBounds: string;
  worldSize: { x: number; y: number; z: number };
  worldMaxAxis: number;
  screenBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  screenCenter: { x: number; y: number };
  screenVisible: boolean;
  sourcePlacement: {
    x: number;
    y: number;
    z: number;
    bearing: number;
    bearingDegrees: number;
  };
  renderAnchorVector: { x: number; y: number; z: number };
  rootPosition: { x: number; y: number; z: number };
  rootRotation: { x: number; y: number; z: number };
  rootScale: { x: number; y: number; z: number };
  layering: {
    mode: string;
    reason: string;
    footprint: number;
    thickness: number;
    renderOrder: number;
    identity: string;
  };
  renderTransform: {
    sourceBearing: number;
    sourceBearingDegrees: number;
    sourceYaw: number;
    sourceYawDegrees: number;
    renderYaw: number;
    renderYawDegrees: number;
    rotation: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
    placementMatrix: string;
    visualMatrix: string;
    matrix: string;
    offset: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    axisMapping: string;
    yawComposition: string;
  };
  modelSurface: {
    offset: number;
    rawOffset: number;
    anchorY: number;
    parentScaleY: number;
    targetMinY: number;
    beforeBounds: string;
    beforeSize: { x: number; y: number; z: number };
    afterBounds: string;
    afterSize: { x: number; y: number; z: number };
    beforeMinY: number;
    beforeMaxY: number;
    afterMinY: number;
    afterMaxY: number;
    liftTarget: string;
    terrainSurface: {
      status: string;
      surfaceY: number;
      worldX: number;
      worldZ: number;
      rayOriginY: number;
      rayFar: number;
      hitCount: number;
      candidateMeshCount: number;
      meshName: string;
      tileId: string;
      modelResRef: string;
    };
    terrainClip: {
      status: string;
      applied: boolean;
      reason: string;
      terrainSurfaceStatus: string;
      footprint: number;
      height: number;
      maxFootprint: number;
      minHeight: number;
      source: string;
    };
    supportSurface: {
      status: string;
      confidence: string;
      candidateCount: number;
      supportObjectId: string;
      supportSourceId: string;
      supportTemplateId: string;
      supportModelResRef: string;
      supportLiftTarget: string;
      supportOverlayReason: string;
      supportTopY: number;
      supportBottomY: number;
      objectBottomY: number;
      objectTopY: number;
      sourceZ: number;
      sourceZDeltaY: number;
      gapY: number;
      overlapX: number;
      overlapZ: number;
      overlapArea: number;
      objectFootprintArea: number;
      supportFootprintArea: number;
    };
    supportCorrection: {
      status: string;
      applied: boolean;
      offsetY: number;
      objectBottomY: number;
      objectTopY: number;
      afterBottomY: number;
      afterTopY: number;
      supportObjectId: string;
      supportSourceId: string;
      supportTemplateId: string;
      supportModelResRef: string;
      supportTopY: number;
      supportBottomY: number;
      gapY: number;
      overlapX: number;
      overlapZ: number;
      overlapArea: number;
      overlapRatio: number;
    };
    overlayReason: string;
    overlayFootprint: number;
    overlayThickness: number;
    overlayRenderOrder: number;
    clamped: boolean;
  };
  renderPosition: string;
  renderAnchor: string;
  bearing: string;
  visualTransform: string;
  visualTransformApplied: boolean;
  inactiveDamageStateMeshSuppressionStatus: string;
  inactiveDamageStateMeshSuppressedCount: number;
  inactiveDamageStateMeshSuppressedNames: string;
  meshCount: number;
  textureStatus: string;
  textureReferencedMaterialCount: number;
  textureMappedMaterialCount: number;
  textureMissingMapMaterialCount: number;
  textureAvailableReferences: string[];
  textureRequestedReferences: string[];
  textureLoadedReferences: string[];
  textureFailedReferences: string[];
  materialTextureReferences: string[];
  materialMapReferences: string[];
  materialFlags: {
    usesAlpha: number;
    usesSoftAlpha: number;
    softAlphaDecal: number;
    transparent: number;
    depthWriteDisabled: number;
    multiplyBlending: number;
    auroraMaterialContract: number;
    auroraMagentaKeyMaterial: number;
  };
  materialOpacityRange: { min: number; max: number };
  materialSamples: AreaSharedRendererMaterialSampleEntry[];
  diagnosticPriority: number;
}

interface AreaSharedRendererMaterialSampleEntry {
  meshName: string;
  meshRenderOrder: number;
  materialName: string;
  materialType: string;
  textureReference: string;
  mapReference: string;
  mapSourceUrl: string;
  mapSize: { width: number; height: number };
  mapFilters: {
    min: string;
    mag: string;
    wrapS: string;
    wrapT: string;
    anisotropy: number;
    generateMipmaps: boolean;
    flipY: boolean;
    colorSpace: string;
  };
  alphaMode: string;
  alphaTest: number;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  depthTest: boolean;
  blending: string;
  side: string;
  polygonOffset: boolean;
  polygonOffsetFactor: number;
  polygonOffsetUnits: number;
  layering: string;
}

export function resolveAreaObjectRuntimeEvidenceDatasetLimit(
  visibleCount: number,
  limit = AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
): { rowCount: number; truncatedCount: number } {
  const safeVisibleCount = Math.max(0, Math.floor(visibleCount));
  const safeLimit = Math.max(0, Math.floor(limit));
  const rowCount = Math.min(safeVisibleCount, safeLimit);
  return {
    rowCount,
    truncatedCount: Math.max(0, safeVisibleCount - rowCount)
  };
}

export function limitAreaRuntimeIdList(
  ids: string[],
  limit = AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
): string[] {
  const safeLimit = Math.max(0, Math.floor(limit));
  return ids.length <= safeLimit ? ids : ids.slice(0, safeLimit);
}

export function shouldConsumeCanvasWheelForCamera(
  runtime: Pick<RuntimeState, "camera" | "controls"> | null | undefined,
  deltaY: number,
  options: { loading?: boolean } = {}
): boolean {
  if (options.loading || !runtime || deltaY === 0) {
    return false;
  }
  const { controls } = runtime;
  if (!controls.enabled || controls.enableZoom === false) {
    return false;
  }

  const distance = runtime.camera.position.distanceTo(controls.target);
  if (!Number.isFinite(distance)) {
    return false;
  }
  const minDistance = Number.isFinite(controls.minDistance) ? controls.minDistance : 0;
  const maxDistance = Number.isFinite(controls.maxDistance)
    ? controls.maxDistance
    : Number.POSITIVE_INFINITY;
  const epsilon = Math.max(CAMERA_WHEEL_DISTANCE_EPSILON, Math.abs(distance) * 0.000001);

  if (deltaY < 0) {
    return distance > minDistance + epsilon;
  }
  return distance < maxDistance - epsilon;
}

export function normalizeWorkspaceRuntimeMaxLights(value: number): number {
  if (!Number.isFinite(value)) {
    return 128;
  }
  return Math.trunc(Math.max(0, Math.min(128, value)));
}

export function applyWorkspaceRuntimeLightBudget(
  runtime: Pick<RuntimeState, "scene"> | null | undefined,
  runtimeMaxLights: number
): number {
  const normalizedMaxLights = normalizeWorkspaceRuntimeMaxLights(runtimeMaxLights);
  if (!runtime) {
    return normalizedMaxLights;
  }
  runtime.scene.userData.auroraLightConfiguredMaxLights = normalizedMaxLights;
  runtime.scene.userData.auroraTerrainTileLightConfiguredMaxLights = normalizedMaxLights;
  runtime.scene.userData.auroraLightConfiguredMaxLightsSource =
    "workspace-options-runtime-max-lights";
  runtime.scene.userData.auroraTerrainTileLightConfiguredMaxLightsSource =
    "workspace-options-runtime-max-lights";
  return normalizedMaxLights;
}

function roundAreaRuntimeNumber(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(6)) : 0;
}

function formatAreaRuntimeVector(value: { x: number; y: number; z: number }): {
  x: number;
  y: number;
  z: number;
} {
  return {
    x: roundAreaRuntimeNumber(value.x),
    y: roundAreaRuntimeNumber(value.y),
    z: roundAreaRuntimeNumber(value.z)
  };
}

function formatAreaRuntimeVectorDataset(value: { x: number; y: number; z: number }): string {
  const vector = formatAreaRuntimeVector(value);
  return `${vector.x},${vector.y},${vector.z}`;
}

function formatAreaRuntimeBounds(box: THREE.Box3): string {
  if (box.isEmpty()) {
    return "empty";
  }
  return [
    formatAreaRuntimeVector(box.min),
    formatAreaRuntimeVector(box.max)
  ]
    .map((vector) => `${vector.x},${vector.y},${vector.z}`)
    .join(" -> ");
}

interface ParsedAreaRuntimeBounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

function parseAreaRuntimeBounds(value: string): ParsedAreaRuntimeBounds | null {
  const parts = value
    .split(" -> ")
    .flatMap((part) => part.split(",").map((token) => Number(token.trim())));
  if (parts.length !== 6 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  return {
    minX: Math.min(parts[0], parts[3]),
    minY: Math.min(parts[1], parts[4]),
    minZ: Math.min(parts[2], parts[5]),
    maxX: Math.max(parts[0], parts[3]),
    maxY: Math.max(parts[1], parts[4]),
    maxZ: Math.max(parts[2], parts[5])
  };
}

function readAreaRuntimeUserDataNumber(
  userData: Record<string, unknown>,
  key: string
): number {
  const value = Number(userData[key]);
  return Number.isFinite(value) ? roundAreaRuntimeNumber(value) : 0;
}

function readAreaRuntimeUserDataOptionalNumber(
  userData: Record<string, unknown>,
  key: string
): number | null {
  const rawValue = userData[key];
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    return null;
  }
  const value = Number(rawValue);
  return Number.isFinite(value) ? roundAreaRuntimeNumber(value) : null;
}

function readAreaRuntimeUserDataString(
  userData: Record<string, unknown>,
  key: string
): string {
  const value = userData[key];
  return typeof value === "string" ? value : "";
}

function readAreaRuntimeRenderTransformEvidence(
  userData: Record<string, unknown>
): AreaSharedRendererVisualTransformSampleEntry["renderTransform"] {
  return {
    sourceBearing: readAreaRuntimeUserDataNumber(
      userData,
      "auroraAreaObjectRenderTransformSourceBearing"
    ),
    sourceBearingDegrees: readAreaRuntimeUserDataNumber(
      userData,
      "auroraAreaObjectRenderTransformSourceBearingDegrees"
    ),
    sourceYaw: readAreaRuntimeUserDataNumber(
      userData,
      "auroraAreaObjectRenderTransformSourceYaw"
    ),
    sourceYawDegrees: readAreaRuntimeUserDataNumber(
      userData,
      "auroraAreaObjectRenderTransformSourceYawDegrees"
    ),
    renderYaw: readAreaRuntimeUserDataNumber(
      userData,
      "auroraAreaObjectRenderTransformRenderYaw"
    ),
    renderYawDegrees: readAreaRuntimeUserDataNumber(
      userData,
      "auroraAreaObjectRenderTransformRenderYawDegrees"
    ),
    rotation: {
      x: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformRotationX"
      ),
      y: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformRotationY"
      ),
      z: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformRotationZ"
      )
    },
    quaternion: {
      x: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformQuaternionX"
      ),
      y: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformQuaternionY"
      ),
      z: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformQuaternionZ"
      ),
      w: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformQuaternionW"
      )
    },
    matrix: readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectRenderTransformMatrix"
    ),
    placementMatrix: readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectRenderTransformPlacementMatrix"
    ),
    visualMatrix: readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectRenderTransformVisualMatrix"
    ),
    offset: {
      x: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformOffsetX"
      ),
      y: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformOffsetY"
      ),
      z: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformOffsetZ"
      )
    },
    scale: {
      x: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformScaleX"
      ),
      y: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformScaleY"
      ),
      z: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformScaleZ"
      )
    },
    axisMapping: readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectRenderTransformAxisMapping"
    ),
    yawComposition: readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectRenderTransformYawComposition"
    )
  };
}

function createEmptyAreaSupportSurfaceEvidence(
  status: string,
  entry?: AreaSharedRendererModelBoundsSampleEntry,
  bounds?: ParsedAreaRuntimeBounds
): AreaSharedRendererModelBoundsSampleEntry["modelSurface"]["supportSurface"] {
  const sourceZ = entry?.sourcePlacement.z ?? 0;
  return {
    status,
    confidence: "none",
    candidateCount: 0,
    supportObjectId: "",
    supportSourceId: "",
    supportTemplateId: "",
    supportModelResRef: "",
    supportLiftTarget: "",
    supportOverlayReason: "",
    supportTopY: 0,
    supportBottomY: 0,
    objectBottomY: roundAreaRuntimeNumber(bounds?.minY ?? 0),
    objectTopY: roundAreaRuntimeNumber(bounds?.maxY ?? 0),
    sourceZ: roundAreaRuntimeNumber(sourceZ),
    sourceZDeltaY: 0,
    gapY: 0,
    overlapX: 0,
    overlapZ: 0,
    overlapArea: 0,
    objectFootprintArea: roundAreaRuntimeNumber(
      bounds ? resolveAreaBoundsFootprintArea(bounds) : 0
    ),
    supportFootprintArea: 0
  };
}

function resolveAreaBoundsFootprintArea(bounds: ParsedAreaRuntimeBounds): number {
  return Math.max(0, bounds.maxX - bounds.minX) *
    Math.max(0, bounds.maxZ - bounds.minZ);
}

function resolveAreaBoundsFootprintOverlap(
  objectBounds: ParsedAreaRuntimeBounds,
  supportBounds: ParsedAreaRuntimeBounds
): { x: number; z: number; area: number } {
  const x = Math.max(
    0,
    Math.min(objectBounds.maxX, supportBounds.maxX) -
      Math.max(objectBounds.minX, supportBounds.minX)
  );
  const z = Math.max(
    0,
    Math.min(objectBounds.maxZ, supportBounds.maxZ) -
      Math.max(objectBounds.minZ, supportBounds.minZ)
  );
  return {
    x,
    z,
    area: x * z
  };
}

function refreshAreaSharedRendererSupportSurfaceEvidence(
  entries: AreaSharedRendererModelBoundsSampleEntry[]
): void {
  const parsedEntries = entries.map((entry) => ({
    entry,
    bounds: parseAreaRuntimeBounds(entry.worldBounds)
  }));

  parsedEntries.forEach(({ entry, bounds }) => {
    if (!bounds) {
      entry.modelSurface.supportSurface =
        createEmptyAreaSupportSurfaceEvidence("invalid-bounds", entry);
      return;
    }

    const sourceZ = entry.sourcePlacement.z;
    const objectFootprintArea = resolveAreaBoundsFootprintArea(bounds);
    if (entry.modelSurface.liftTarget === "terrain-overlay") {
      entry.modelSurface.supportSurface =
        createEmptyAreaSupportSurfaceEvidence("terrain-overlay", entry, bounds);
      return;
    }

    const candidates = parsedEntries
      .filter((candidate) => candidate.entry !== entry && candidate.bounds)
      .filter((candidate) => candidate.entry.modelSurface.liftTarget !== "terrain-overlay")
      .map((candidate) => {
        const supportBounds = candidate.bounds as ParsedAreaRuntimeBounds;
        const overlap = resolveAreaBoundsFootprintOverlap(bounds, supportBounds);
        const supportFootprintArea =
          resolveAreaBoundsFootprintArea(supportBounds);
        const gapY = bounds.minY - supportBounds.maxY;
        const sourceZDeltaY = sourceZ - supportBounds.maxY;
        return {
          entry: candidate.entry,
          bounds: supportBounds,
          overlap,
          supportFootprintArea,
          gapY,
          sourceZDeltaY
        };
      })
      .filter((candidate) => {
        if (candidate.overlap.area <= 0.000001) {
          return false;
        }
        if (candidate.supportFootprintArea <= 0.000001) {
          return false;
        }
        if (candidate.bounds.maxY < -0.02) {
          return false;
        }
        if (candidate.gapY < -0.05 || candidate.gapY > 0.2) {
          return false;
        }
        const objectFootprintRatio =
          candidate.supportFootprintArea / Math.max(objectFootprintArea, 0.000001);
        const overlapRatio =
          candidate.overlap.area / Math.max(objectFootprintArea, 0.000001);
        if (objectFootprintRatio < 0.5 && overlapRatio < 0.5) {
          return false;
        }
        return (
          Math.abs(candidate.sourceZDeltaY) <= 0.35 ||
          Math.abs(candidate.gapY) <= 0.35
        );
      });

    if (candidates.length === 0) {
      entry.modelSurface.supportSurface =
        createEmptyAreaSupportSurfaceEvidence("none", entry, bounds);
      return;
    }

    const best = candidates.sort((left, right) => {
      const leftSizePenalty =
        left.supportFootprintArea < objectFootprintArea * 0.5 ? 0.05 : 0;
      const rightSizePenalty =
        right.supportFootprintArea < objectFootprintArea * 0.5 ? 0.05 : 0;
      const leftScore =
        Math.abs(left.sourceZDeltaY) * 100 +
        Math.abs(left.gapY) * 25 +
        leftSizePenalty -
        Math.min(1, left.overlap.area / Math.max(objectFootprintArea, 0.000001));
      const rightScore =
        Math.abs(right.sourceZDeltaY) * 100 +
        Math.abs(right.gapY) * 25 +
        rightSizePenalty -
        Math.min(1, right.overlap.area / Math.max(objectFootprintArea, 0.000001));
      return leftScore - rightScore;
    })[0];

    const sourceZDeltaAbs = Math.abs(best.sourceZDeltaY);
    const gapAbs = Math.abs(best.gapY);
    const confidence =
      sourceZDeltaAbs <= 0.012 || gapAbs <= 0.012
        ? "strong"
        : sourceZDeltaAbs <= 0.04 || gapAbs <= 0.04
          ? "medium"
          : "weak";

    entry.modelSurface.supportSurface = {
      status: "hit",
      confidence,
      candidateCount: candidates.length,
      supportObjectId: best.entry.objectId,
      supportSourceId: best.entry.sourceId,
      supportTemplateId: best.entry.templateId,
      supportModelResRef: best.entry.payloadModelResRef,
      supportLiftTarget: best.entry.modelSurface.liftTarget,
      supportOverlayReason: best.entry.modelSurface.overlayReason,
      supportTopY: roundAreaRuntimeNumber(best.bounds.maxY),
      supportBottomY: roundAreaRuntimeNumber(best.bounds.minY),
      objectBottomY: roundAreaRuntimeNumber(bounds.minY),
      objectTopY: roundAreaRuntimeNumber(bounds.maxY),
      sourceZ: roundAreaRuntimeNumber(sourceZ),
      sourceZDeltaY: roundAreaRuntimeNumber(best.sourceZDeltaY),
      gapY: roundAreaRuntimeNumber(best.gapY),
      overlapX: roundAreaRuntimeNumber(best.overlap.x),
      overlapZ: roundAreaRuntimeNumber(best.overlap.z),
      overlapArea: roundAreaRuntimeNumber(best.overlap.area),
      objectFootprintArea: roundAreaRuntimeNumber(objectFootprintArea),
      supportFootprintArea: roundAreaRuntimeNumber(best.supportFootprintArea)
    };
  });
}

function resolveAreaRuntimeScreenProjection(
  runtime: RuntimeState,
  box: THREE.Box3
): AreaSharedRendererModelBoundsSampleEntry["screenBounds"] & {
  center: AreaSharedRendererModelBoundsSampleEntry["screenCenter"];
  visible: boolean;
} {
  const canvas = runtime.renderer.domElement;
  const width = canvas.clientWidth || canvas.width || 0;
  const height = canvas.clientHeight || canvas.height || 0;
  if (box.isEmpty() || width <= 0 || height <= 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
      center: { x: 0, y: 0 },
      visible: false
    };
  }

  runtime.camera.updateMatrixWorld(true);
  runtime.camera.updateProjectionMatrix();
  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z)
  ];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let visible = false;
  for (const corner of corners) {
    const projected = corner.project(runtime.camera);
    const x = (projected.x * 0.5 + 0.5) * width;
    const y = (-projected.y * 0.5 + 0.5) * height;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    if (
      projected.x >= -1 &&
      projected.x <= 1 &&
      projected.y >= -1 &&
      projected.y <= 1 &&
      projected.z >= -1 &&
      projected.z <= 1
    ) {
      visible = true;
    }
  }
  const screenWidth = Math.max(0, maxX - minX);
  const screenHeight = Math.max(0, maxY - minY);
  return {
    minX: roundAreaRuntimeNumber(minX),
    minY: roundAreaRuntimeNumber(minY),
    maxX: roundAreaRuntimeNumber(maxX),
    maxY: roundAreaRuntimeNumber(maxY),
    width: roundAreaRuntimeNumber(screenWidth),
    height: roundAreaRuntimeNumber(screenHeight),
    center: {
      x: roundAreaRuntimeNumber(minX + screenWidth / 2),
      y: roundAreaRuntimeNumber(minY + screenHeight / 2)
    },
    visible
  };
}

function isAreaRuntimeObjectEffectivelyVisible(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) {
      return false;
    }
    current = current.parent;
  }
  return true;
}

function resolveAreaRuntimeToolsetPhysicalVisibility(root: THREE.Object3D): {
  hidden: boolean;
  reason: string;
  source: string;
} {
  let hidden = root.userData?.auroraAreaObjectToolsetPhysicalVisibility === "hidden";
  let reason =
    typeof root.userData?.auroraAreaObjectToolsetPhysicalVisibilityReason === "string"
      ? root.userData.auroraAreaObjectToolsetPhysicalVisibilityReason
      : "";
  let source =
    typeof root.userData?.auroraAreaObjectToolsetPhysicalVisibilitySource === "string"
      ? root.userData.auroraAreaObjectToolsetPhysicalVisibilitySource
      : "";

  root.traverse((node) => {
    if (hidden) {
      return;
    }
    if (node.userData?.auroraAreaObjectToolsetPhysicalVisibility !== "hidden") {
      return;
    }
    hidden = true;
    reason =
      typeof node.userData?.auroraAreaObjectToolsetPhysicalVisibilityReason === "string"
        ? node.userData.auroraAreaObjectToolsetPhysicalVisibilityReason
        : "";
    source =
      typeof node.userData?.auroraAreaObjectToolsetPhysicalVisibilitySource === "string"
        ? node.userData.auroraAreaObjectToolsetPhysicalVisibilitySource
        : "";
  });

  return { hidden, reason, source };
}

function isAreaRuntimeMeshEffectivelyVisible(mesh: THREE.Mesh): boolean {
  if (!isAreaRuntimeObjectEffectivelyVisible(mesh)) {
    return false;
  }
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.some((material) => material.visible !== false);
}

function resolveAreaRuntimeVisibleWorldBounds(root: THREE.Object3D): THREE.Box3 {
  const bounds = new THREE.Box3();
  const meshBounds = new THREE.Box3();
  root.updateWorldMatrix(true, true);
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !isAreaRuntimeMeshEffectivelyVisible(mesh)) {
      return;
    }
    meshBounds.setFromObject(mesh);
    if (!meshBounds.isEmpty()) {
      bounds.union(meshBounds);
    }
  });
  return bounds;
}

function readAreaRuntimeMaterialTextureReference(material: THREE.Material): string {
  const userData = material.userData as Record<string, unknown>;
  const primaryTextureReference = userData.auroraPrimaryTextureReference;
  if (typeof primaryTextureReference === "string" && primaryTextureReference.trim().length > 0) {
    return primaryTextureReference.trim();
  }
  const directTextureReference = userData.textureReference;
  if (typeof directTextureReference === "string" && directTextureReference.trim().length > 0) {
    return directTextureReference.trim();
  }
  const aurora = userData.aurora;
  if (aurora && typeof aurora === "object" && "textureReference" in aurora) {
    const auroraTextureReference = (aurora as { textureReference?: unknown }).textureReference;
    if (typeof auroraTextureReference === "string" && auroraTextureReference.trim().length > 0) {
      return auroraTextureReference.trim();
    }
  }
  const materialNameMatch = material.name.match(/^Aurora material\s+(.+)$/iu);
  return materialNameMatch?.[1]?.trim() ?? "";
}

function readAreaRuntimeTextureReference(texture: THREE.Texture | null): string {
  if (!texture) {
    return "";
  }
  if (typeof texture.userData?.auroraTextureReference === "string") {
    return texture.userData.auroraTextureReference;
  }
  if (typeof texture.userData?.auroraSourceUrl === "string") {
    return texture.userData.auroraSourceUrl;
  }
  if (typeof texture.name === "string" && texture.name.trim().length > 0) {
    return texture.name.trim();
  }
  return "";
}

function readAreaRuntimeTextureImageSize(texture: THREE.Texture | null): {
  width: number;
  height: number;
} {
  const image = texture?.image as { width?: unknown; height?: unknown } | undefined;
  const width = Number(image?.width);
  const height = Number(image?.height);
  return {
    width: Number.isFinite(width) ? Math.max(0, Math.floor(width)) : 0,
    height: Number.isFinite(height) ? Math.max(0, Math.floor(height)) : 0
  };
}

function formatAreaRuntimeTextureFilter(value: unknown): string {
  switch (value) {
    case THREE.NearestFilter:
      return "NearestFilter";
    case THREE.NearestMipmapNearestFilter:
      return "NearestMipmapNearestFilter";
    case THREE.NearestMipmapLinearFilter:
      return "NearestMipmapLinearFilter";
    case THREE.LinearFilter:
      return "LinearFilter";
    case THREE.LinearMipmapNearestFilter:
      return "LinearMipmapNearestFilter";
    case THREE.LinearMipmapLinearFilter:
      return "LinearMipmapLinearFilter";
    default:
      return String(value ?? "");
  }
}

function formatAreaRuntimeTextureWrapping(value: unknown): string {
  switch (value) {
    case THREE.RepeatWrapping:
      return "RepeatWrapping";
    case THREE.ClampToEdgeWrapping:
      return "ClampToEdgeWrapping";
    case THREE.MirroredRepeatWrapping:
      return "MirroredRepeatWrapping";
    default:
      return String(value ?? "");
  }
}

function formatAreaRuntimeMaterialBlending(value: unknown): string {
  switch (value) {
    case THREE.NoBlending:
      return "NoBlending";
    case THREE.NormalBlending:
      return "NormalBlending";
    case THREE.AdditiveBlending:
      return "AdditiveBlending";
    case THREE.SubtractiveBlending:
      return "SubtractiveBlending";
    case THREE.MultiplyBlending:
      return "MultiplyBlending";
    case THREE.CustomBlending:
      return "CustomBlending";
    default:
      return String(value ?? "");
  }
}

function formatAreaRuntimeMaterialSide(value: unknown): string {
  switch (value) {
    case THREE.FrontSide:
      return "FrontSide";
    case THREE.BackSide:
      return "BackSide";
    case THREE.DoubleSide:
      return "DoubleSide";
    default:
      return String(value ?? "");
  }
}

function collectAreaSharedRendererMaterialEvidence(root: THREE.Object3D): {
  textureReferences: string[];
  mapReferences: string[];
  flags: AreaSharedRendererModelBoundsSampleEntry["materialFlags"];
  opacityRange: AreaSharedRendererModelBoundsSampleEntry["materialOpacityRange"];
  materialSamples: AreaSharedRendererModelBoundsSampleEntry["materialSamples"];
  diagnosticPriority: number;
} {
  const textureReferences = new Set<string>();
  const mapReferences = new Set<string>();
  const materialSamples: AreaSharedRendererModelBoundsSampleEntry["materialSamples"] = [];
  const flags: AreaSharedRendererModelBoundsSampleEntry["materialFlags"] = {
    usesAlpha: 0,
    usesSoftAlpha: 0,
    softAlphaDecal: 0,
    transparent: 0,
    depthWriteDisabled: 0,
    multiplyBlending: 0,
    auroraMaterialContract: 0,
    auroraMagentaKeyMaterial: 0
  };
  let minOpacity = Number.POSITIVE_INFINITY;
  let maxOpacity = 0;
  let diagnosticPriority = 0;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material || !isAreaRuntimeMeshEffectivelyVisible(mesh)) {
      return;
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (material.visible === false) {
        return;
      }
      const userData = material.userData as Record<string, unknown>;
      const textureReference = readAreaRuntimeMaterialTextureReference(material);
      if (textureReference.length > 0) {
        textureReferences.add(textureReference);
        if (/(?:blood|dirt|plama|splat|stain|scorch|spill|mud|smudge|decal|plant|ob_plant|rug|carpet|dywan|wit2)/iu.test(textureReference)) {
          diagnosticPriority += 2;
        }
      }
      const materialWithMap = material as THREE.Material & { map?: unknown };
      const materialMap = materialWithMap.map instanceof THREE.Texture ? materialWithMap.map : null;
      const materialMapReference = readAreaRuntimeTextureReference(materialMap);
      if (materialMapReference.trim().length > 0) {
        const normalizedMaterialMapReference = materialMapReference.trim();
        mapReferences.add(normalizedMaterialMapReference);
        if (/fxpa_smoke01/iu.test(normalizedMaterialMapReference) && material.opacity > 0.01) {
          diagnosticPriority += 8;
        }
        if (/ob_plantmag/iu.test(normalizedMaterialMapReference)) {
          diagnosticPriority += 4;
        }
      }
      minOpacity = Math.min(minOpacity, material.opacity);
      maxOpacity = Math.max(maxOpacity, material.opacity);
      if (userData.auroraTextureUsesAlpha === true) {
        flags.usesAlpha += 1;
      }
      if (userData.auroraTextureUsesSoftAlpha === true) {
        flags.usesSoftAlpha += 1;
        diagnosticPriority += 1;
      }
      if (userData.auroraSoftAlphaDecalMaterial === true) {
        flags.softAlphaDecal += 1;
        diagnosticPriority += 3;
      }
      if (material.transparent) {
        flags.transparent += 1;
      }
      if (!material.depthWrite) {
        flags.depthWriteDisabled += 1;
      }
      if (material.blending === THREE.MultiplyBlending) {
        flags.multiplyBlending += 1;
      }
      if (typeof userData.auroraMaterialContractSource === "string") {
        flags.auroraMaterialContract += 1;
      }
      if (userData.auroraMagentaKeyMaterial === true) {
        flags.auroraMagentaKeyMaterial += 1;
        diagnosticPriority += 3;
      }
      if (materialSamples.length < 24) {
        const mapSize = readAreaRuntimeTextureImageSize(materialMap);
        materialSamples.push({
          meshName: mesh.name || "",
          meshRenderOrder: Math.floor(mesh.renderOrder),
          materialName: material.name || "",
          materialType: material.type,
          textureReference,
          mapReference: materialMapReference.trim(),
          mapSourceUrl:
            materialMap && typeof materialMap.userData?.auroraSourceUrl === "string"
              ? materialMap.userData.auroraSourceUrl
              : "",
          mapSize,
          mapFilters: {
            min: formatAreaRuntimeTextureFilter(materialMap?.minFilter),
            mag: formatAreaRuntimeTextureFilter(materialMap?.magFilter),
            wrapS: formatAreaRuntimeTextureWrapping(materialMap?.wrapS),
            wrapT: formatAreaRuntimeTextureWrapping(materialMap?.wrapT),
            anisotropy: roundAreaRuntimeNumber(Number(materialMap?.anisotropy ?? 0)),
            generateMipmaps: materialMap?.generateMipmaps === true,
            flipY: materialMap?.flipY === true,
            colorSpace: materialMap?.colorSpace ?? ""
          },
          alphaMode:
            typeof userData.auroraTextureAlphaMode === "string"
              ? userData.auroraTextureAlphaMode
              : "",
          alphaTest: roundAreaRuntimeNumber(material.alphaTest),
          opacity: roundAreaRuntimeNumber(material.opacity),
          transparent: material.transparent === true,
          depthWrite: material.depthWrite === true,
          depthTest: material.depthTest === true,
          blending: formatAreaRuntimeMaterialBlending(material.blending),
          side: formatAreaRuntimeMaterialSide(material.side),
          polygonOffset: material.polygonOffset === true,
          polygonOffsetFactor: roundAreaRuntimeNumber(material.polygonOffsetFactor),
          polygonOffsetUnits: roundAreaRuntimeNumber(material.polygonOffsetUnits),
          layering:
            typeof userData.auroraAreaObjectLayering === "string"
              ? userData.auroraAreaObjectLayering
              : ""
        });
      }
    });
  });
  return {
    textureReferences: Array.from(textureReferences).slice(0, 12),
    mapReferences: Array.from(mapReferences).slice(0, 12),
    flags,
    opacityRange: {
      min: Number.isFinite(minOpacity) ? roundAreaRuntimeNumber(minOpacity) : 0,
      max: roundAreaRuntimeNumber(maxOpacity)
    },
    materialSamples,
    diagnosticPriority
  };
}

interface AreaTileProcessRuntimeSnapshot {
  version: "aurora-areas-tile-process-runtime/v1";
  path: "backend-tile-process-contract";
  status: "not_checked" | AreaTileProcessContractReadiness["status"];
  areaId: string | null;
  expectedCandidateCount: number;
  pendingCandidateCount: number;
  checkedCandidateCount: number;
  readyCandidateCount: number;
  blockedCandidateCount: number;
  sourceAssetReadyCount: number;
  mdlSourceReadyCount: number;
  glbGeometryReadyCount: number;
  materialTextureContractReadyCount: number;
  materialBindingBlockedCount: number;
  renderLoaderReadyCount: number;
  blockerSummary: string;
  sourceObjectKeySample: string;
  sourceAssetContractSample: string;
  textureMaterialBlockerSummary: string;
  renderAssetContractBlockerSummary: string;
  mdlGlbMaterialBlockerSummary: string;
}

interface ItemVisualProofObjectSnapshot {
  objectId: string;
  kind: SceneObjectKind;
  name: string;
  tag: string;
  resRef: string;
  sourceType: string;
  sourceId: string;
  templateId: string;
  childCount: number;
  meshCount: number;
  materialCount: number;
  worldBounds: string;
  worldSize: { x: number; y: number; z: number };
  worldMaxAxis: number;
  screenBounds: AreaSharedRendererModelBoundsSampleEntry["screenBounds"];
  screenCenter: AreaSharedRendererModelBoundsSampleEntry["screenCenter"];
  screenVisible: boolean;
  rootPosition: { x: number; y: number; z: number };
  rootRotation: { x: number; y: number; z: number };
  rootScale: { x: number; y: number; z: number };
  preview: {
    mode: string;
    baseItem: number | null;
    baseItemLabel: string;
    modelType: string;
    modelParts: string;
    modelPartResRefs: string;
    textureReferenceCount: number;
    textureReferences: string[];
    modelTextureLoadStatus: string;
    modelTextureReferenceCount: number;
    modelTextureLoadedCount: number;
    modelTextureBindingCount: number;
    modelTextureReferences: string[];
    modelTextureLoadedReferences: string[];
    modelPartTextureFallbackReferences: string[];
    modelPartTextureApplicationReferences: string[];
    modelPartTextureForcedReferences: string[];
    modelPartTextureForcedMaterialCount: number;
    armorPartTextureFallbackReferences: string[];
    armorPartTextureApplicationReferences: string[];
    armorPartTextureForcedReferences: string[];
    armorPartTextureForcedMaterialCount: number;
    materialColorStatus: string;
    armorPartPltBridgeStatus: string;
    armorPartPltBridgeCount: number;
    armorPartTintStatus: string;
    armorPartTintAppliedCount: number;
    armorPartTintColor: string;
    armorPartCount: number;
    modelPartCount: number;
    iconStatus: string;
    iconResRef: string;
    iconSource: string;
    runtimeEffectStatus: string;
    runtimeEffectMode: string;
    runtimeEffectAnimationClipCount: number;
    runtimeEffectAnimationClipNames: string[];
    danglymeshStatus: string;
    danglymeshMode: string;
    danglymeshMeshCount: number;
    danglymeshWeightedVertexCount: number;
    danglymeshNodeNames: string[];
    animmeshStatus: string;
    animmeshMode: string;
    animmeshMeshCount: number;
    alphaAnimationStatus: string;
    selfIllumColorAnimationStatus: string;
    textureCycleStatus: string;
  };
  sharedRenderer: {
    marker: string;
    geometryStatus: string;
    placeholderReason: string;
    textureStatus: string;
    modelUrl: string;
    modelCacheKey: string;
    modelBounds: string;
    modelMaxAxis: number;
    modelMeshCount: number;
  };
  materialEvidence: ReturnType<typeof collectAreaSharedRendererMaterialEvidence>;
}

interface ItemVisualProofSnapshot {
  version: "aurora-items-visual-proof/v1";
  capturedAt: string;
  label: string;
  sceneId: string;
  areaName: string;
  renderAreaGeometry: boolean;
  visibleObjectCount: number;
  selectedObjectIds: string[];
  canvas: {
    width: number;
    height: number;
    clientWidth: number;
    clientHeight: number;
  };
  imageDataUrl?: string;
  camera: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    up: { x: number; y: number; z: number };
    fov: number;
    near: number;
    far: number;
    frameStatus: string;
    frameMode: string;
    frameTarget: string;
    frameDistance: string;
    frameSource: string;
  };
  objects: ItemVisualProofObjectSnapshot[];
}

function countRuntimeMeshesAndMaterials(root: THREE.Object3D): {
  meshCount: number;
  materialCount: number;
} {
  let meshCount = 0;
  let materialCount = 0;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) {
      return;
    }
    meshCount += 1;
    materialCount += Array.isArray(mesh.material) ? mesh.material.length : 1;
  });
  return { meshCount, materialCount };
}

function readProofUserDataString(
  userData: Record<string, unknown>,
  key: string
): string {
  const value = userData[key];
  return typeof value === "string" ? value : "";
}

function readProofUserDataNumber(
  userData: Record<string, unknown>,
  key: string
): number {
  const value = Number(userData[key]);
  return Number.isFinite(value) ? value : 0;
}

function readProofUserDataStringArray(
  userData: Record<string, unknown>,
  key: string
): string[] {
  const value = userData[key];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string") {
    return value
      .split("|")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function buildItemVisualProofSnapshot(
  runtime: RuntimeState,
  sceneData: AreaScene | null,
  visibleObjects: SceneObject[],
  selectedObjectIds: string[],
  options: { label?: string; renderAreaGeometry?: boolean } = {}
): ItemVisualProofSnapshot {
  const canvas = runtime.renderer.domElement;
  let imageDataUrl = "";
  try {
    renderRuntime(runtime);
    imageDataUrl = canvas.toDataURL("image/png");
  } catch {
    imageDataUrl = "";
  }
  const objects = visibleObjects
    .map((object): ItemVisualProofObjectSnapshot | null => {
      const root = runtime.objectMeshById.get(object.id);
      if (!root) {
        return null;
      }
      root.updateWorldMatrix(true, true);
      const worldBounds = new THREE.Box3().setFromObject(root);
      const worldSize = new THREE.Vector3();
      worldBounds.getSize(worldSize);
      const worldMaxAxis = worldBounds.isEmpty()
        ? 0
        : Math.max(Math.abs(worldSize.x), Math.abs(worldSize.y), Math.abs(worldSize.z));
      const projection = resolveAreaRuntimeScreenProjection(runtime, worldBounds);
      const userData = root.userData as Record<string, unknown>;
      const meshStats = countRuntimeMeshesAndMaterials(root);
      const materialEvidence = collectAreaSharedRendererMaterialEvidence(root);
      return {
        objectId: object.id,
        kind: object.kind,
        name: object.name ?? "",
        tag: object.tag,
        resRef: object.resRef,
        sourceType: object.source?.type ?? "local",
        sourceId: object.source?.sourceObjectId ?? "",
        templateId: object.source?.templateId ?? object.resRef,
        childCount: root.children.length,
        meshCount: meshStats.meshCount,
        materialCount: meshStats.materialCount,
        worldBounds: formatAreaRuntimeBounds(worldBounds),
        worldSize: formatAreaRuntimeVector(worldSize),
        worldMaxAxis: roundAreaRuntimeNumber(worldMaxAxis),
        screenBounds: {
          minX: projection.minX,
          minY: projection.minY,
          maxX: projection.maxX,
          maxY: projection.maxY,
          width: projection.width,
          height: projection.height
        },
        screenCenter: projection.center,
        screenVisible: projection.visible,
        rootPosition: formatAreaRuntimeVector(root.position),
        rootRotation: formatAreaRuntimeVector(root.rotation),
        rootScale: formatAreaRuntimeVector(root.scale),
        preview: {
          mode: readProofUserDataString(userData, "itemPreviewMode"),
          baseItem: Number.isFinite(Number(userData.itemPreviewBaseItem))
            ? Number(userData.itemPreviewBaseItem)
            : null,
          baseItemLabel: readProofUserDataString(userData, "itemPreviewBaseItemLabel"),
          modelType: readProofUserDataString(userData, "itemPreviewModelType"),
          modelParts: readProofUserDataString(userData, "itemPreviewModelParts"),
          modelPartResRefs: readProofUserDataString(userData, "itemPreviewModelPartResRefs"),
          textureReferenceCount: readProofUserDataNumber(
            userData,
            "itemPreviewTextureReferenceCount"
          ),
          textureReferences: readProofUserDataStringArray(
            userData,
            "itemPreviewTextureReferences"
          ),
          modelTextureLoadStatus: readProofUserDataString(
            userData,
            "itemModelTextureLoadStatus"
          ),
          modelTextureReferenceCount: readProofUserDataNumber(
            userData,
            "itemModelTextureReferenceCount"
          ),
          modelTextureLoadedCount: readProofUserDataNumber(
            userData,
            "itemModelTextureLoadedCount"
          ),
          modelTextureBindingCount: readProofUserDataNumber(
            userData,
            "itemModelTextureBindingCount"
          ),
          modelTextureReferences: readProofUserDataStringArray(
            userData,
            "itemModelTextureReferences"
          ),
          modelTextureLoadedReferences: readProofUserDataStringArray(
            userData,
            "itemModelTextureLoadedReferences"
          ),
          modelPartTextureFallbackReferences: readProofUserDataStringArray(
            userData,
            "itemModelPartTextureFallbackReferences"
          ),
          modelPartTextureApplicationReferences: readProofUserDataStringArray(
            userData,
            "itemModelPartTextureApplicationReferences"
          ),
          modelPartTextureForcedReferences: readProofUserDataStringArray(
            userData,
            "itemModelPartTextureForcedReferences"
          ),
          modelPartTextureForcedMaterialCount: readProofUserDataNumber(
            userData,
            "itemModelPartTextureForcedMaterialCount"
          ),
          armorPartTextureFallbackReferences: readProofUserDataStringArray(
            userData,
            "itemArmorPartTextureFallbackReferences"
          ),
          armorPartTextureApplicationReferences: readProofUserDataStringArray(
            userData,
            "itemArmorPartTextureApplicationReferences"
          ),
          armorPartTextureForcedReferences: readProofUserDataStringArray(
            userData,
            "itemArmorPartTextureForcedReferences"
          ),
          armorPartTextureForcedMaterialCount: readProofUserDataNumber(
            userData,
            "itemArmorPartTextureForcedMaterialCount"
          ),
          materialColorStatus: readProofUserDataString(userData, "itemMaterialColorStatus"),
          armorPartPltBridgeStatus: readProofUserDataString(
            userData,
            "itemArmorPartPltBridgeStatus"
          ),
          armorPartPltBridgeCount: readProofUserDataNumber(
            userData,
            "itemArmorPartPltBridgeCount"
          ),
          armorPartTintStatus: readProofUserDataString(userData, "itemArmorPartTintStatus"),
          armorPartTintAppliedCount: readProofUserDataNumber(
            userData,
            "itemArmorPartTintAppliedCount"
          ),
          armorPartTintColor: readProofUserDataString(userData, "itemArmorPartTintColor"),
          armorPartCount: readProofUserDataNumber(
            userData,
            "itemArmorPartGroupPartCount"
          ),
          modelPartCount: readProofUserDataNumber(
            userData,
            "itemModelPartGroupPartCount"
          ),
          iconStatus: readProofUserDataString(userData, "itemIconFallbackStatus"),
          iconResRef: readProofUserDataString(userData, "itemIconFallbackIconResRef"),
          iconSource: readProofUserDataString(userData, "itemIconFallbackSource"),
          runtimeEffectStatus: readProofUserDataString(userData, "itemRuntimeEffectStatus"),
          runtimeEffectMode: readProofUserDataString(userData, "itemRuntimeEffectMode"),
          runtimeEffectAnimationClipCount: readProofUserDataNumber(
            userData,
            "itemRuntimeEffectAnimationClipCount"
          ),
          runtimeEffectAnimationClipNames: readProofUserDataStringArray(
            userData,
            "itemRuntimeEffectAnimationClipNames"
          ),
          danglymeshStatus: readProofUserDataString(userData, "itemDanglymeshStatus"),
          danglymeshMode: readProofUserDataString(userData, "itemDanglymeshMode"),
          danglymeshMeshCount: readProofUserDataNumber(userData, "itemDanglymeshMeshCount"),
          danglymeshWeightedVertexCount: readProofUserDataNumber(
            userData,
            "itemDanglymeshWeightedVertexCount"
          ),
          danglymeshNodeNames: readProofUserDataStringArray(
            userData,
            "itemDanglymeshNodeNames"
          ),
          animmeshStatus: readProofUserDataString(userData, "itemAnimmeshStatus"),
          animmeshMode: readProofUserDataString(userData, "itemAnimmeshMode"),
          animmeshMeshCount: readProofUserDataNumber(userData, "itemAnimmeshMeshCount"),
          alphaAnimationStatus: readProofUserDataString(
            userData,
            "itemAlphaAnimationStatus"
          ),
          selfIllumColorAnimationStatus: readProofUserDataString(
            userData,
            "itemSelfIllumColorAnimationStatus"
          ),
          textureCycleStatus: readProofUserDataString(userData, "itemTextureCycleStatus")
        },
        sharedRenderer: {
          marker: readProofUserDataString(
            userData,
            "auroraAreaObjectSharedRendererRuntimeMarker"
          ),
          geometryStatus: readProofUserDataString(
            userData,
            "auroraAreaObjectSharedRendererGeometryStatus"
          ),
          placeholderReason: readProofUserDataString(
            userData,
            "auroraAreaObjectSharedRendererPlaceholderReason"
          ),
          textureStatus: readProofUserDataString(
            userData,
            "auroraAreaObjectSharedRendererTextureStatus"
          ),
          modelUrl: readProofUserDataString(
            userData,
            "auroraAreaObjectSharedRendererModelUrl"
          ),
          modelCacheKey: readProofUserDataString(userData, "renderPackageModelCacheKey"),
          modelBounds: readProofUserDataString(
            userData,
            "auroraAreaObjectSharedRendererModelBounds"
          ),
          modelMaxAxis: readProofUserDataNumber(
            userData,
            "auroraAreaObjectSharedRendererModelMaxAxis"
          ),
          modelMeshCount: readProofUserDataNumber(
            userData,
            "auroraAreaObjectSharedRendererModelMeshCount"
          )
        },
        materialEvidence
      };
    })
    .filter((entry): entry is ItemVisualProofObjectSnapshot => entry !== null);

  const snapshot: ItemVisualProofSnapshot = {
    version: "aurora-items-visual-proof/v1",
    capturedAt: new Date().toISOString(),
    label: options.label ?? "",
    sceneId: sceneData?.sceneId ?? "",
    areaName: sceneData?.areaName ?? "",
    renderAreaGeometry: options.renderAreaGeometry ?? false,
    visibleObjectCount: visibleObjects.length,
    selectedObjectIds,
    canvas: {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    },
    ...(imageDataUrl ? { imageDataUrl } : {}),
    camera: {
      position: formatAreaRuntimeVector(runtime.camera.position),
      target: formatAreaRuntimeVector(runtime.controls.target),
      up: formatAreaRuntimeVector(runtime.camera.up),
      fov: roundAreaRuntimeNumber(runtime.camera.fov),
      near: roundAreaRuntimeNumber(runtime.camera.near),
      far: roundAreaRuntimeNumber(runtime.camera.far),
      frameStatus: runtime.container.dataset.areaCameraFrameStatus ?? "",
      frameMode: runtime.container.dataset.areaCameraFrameMode ?? "",
      frameTarget: runtime.container.dataset.areaCameraFrameTarget ?? "",
      frameDistance: runtime.container.dataset.areaCameraFrameDistance ?? "",
      frameSource: runtime.container.dataset.areaCameraFrameSource ?? ""
    },
    objects
  };

  runtime.container.dataset.itemVisualProofSnapshot = JSON.stringify(snapshot);
  runtime.container.dataset.itemVisualProofSnapshotObjectCount = String(objects.length);
  runtime.container.dataset.itemVisualProofSnapshotLabel = snapshot.label;
  runtime.container.dispatchEvent(
    new CustomEvent<ItemVisualProofSnapshot>(ITEM_VISUAL_PROOF_SNAPSHOT_EVENT, {
      detail: snapshot
    })
  );
  return snapshot;
}
export {
  filterObjectsByRenderObjectIds,
  isObjectVisibleWithRenderFilter,
  resolveObjectAddDropPlacement,
  resolveRenderObjectIdsSet,
  resolveSceneGridVisibility,
  resolveSceneObjectRenderScale,
  shouldRenderAreaGeometry
};
export type { SceneGridVisibility };

type WorkspaceCanvasViewportFacade = Pick<
  ViewportFacade,
  "defaultMasterCellsPerTile" | "isContextMenuGesture" | "isCtrlPanGesture" | "buildGridSegments"
>;

type WorkspaceCanvasTelemetryTrack = (name: string, payload?: TelemetryPayload) => void;

const defaultViewportFacade: WorkspaceCanvasViewportFacade = {
  defaultMasterCellsPerTile: MASTER_CELLS_PER_TILE,
  isContextMenuGesture,
  isCtrlPanGesture,
  buildGridSegments(widthTiles, heightTiles, masterCellsPerTile) {
    return buildCanvasGridSegments(widthTiles, heightTiles, masterCellsPerTile);
  }
};

const defaultTrackTelemetryEvent: WorkspaceCanvasTelemetryTrack = (name, payload) => {
  browserTelemetryFacade.track(name, payload);
};

function isPlaceablesVfxPreviewObject(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined
): boolean {
  return (
    object.kind === "placeables" &&
    Boolean(
      object.vfxPayload ||
        payload?.placeable.render.isVfx ||
        payload?.placeable.render.frontendType === "vfx" ||
        payload?.placeable.placeableSubtype === "vfx"
    )
  );
}

function findVfxPreviewFrameTarget(root: THREE.Object3D | null): THREE.Object3D | null {
  if (!root) {
    return null;
  }
  let target: THREE.Object3D | null = null;
  root.traverse((node) => {
    if (target) {
      return;
    }
    const data = node.userData;
    if (
      data?.vfxPreviewRole ||
      data?.auroraEmitterPreviewMode ||
      data?.auroraEmitterParticleSizeVisibilityFloorPreviewMode
    ) {
      target = node;
    }
  });
  return target ?? root;
}

export function readPlaceablesVfxPreviewDrawMetrics(root: THREE.Object3D | null): {
  drawParticles: number;
  renderedVertices: number;
  drawLanes: string[];
  auroraLightNodes: string[];
  auroraLightSourceNodeCount: number;
  auroraLightAcceptedNodeCount: number;
  auroraLightFlarePayloadNodeCount: number;
  auroraLightFlareRadiusWriteUnverified: boolean;
  auroraLightBudgetStrategy: string | null;
  auroraLightBudgetStrategySource: string | null;
  auroraLightBudgetStrategyProofStatus: string | null;
  auroraLightPreviewMode: string | null;
} {
  let drawParticles = 0;
  let renderedVertices = 0;
  const drawLanes = new Set<string>();
  const auroraLightNodes = new Set<string>();
  let auroraLightSourceNodeCount = 0;
  let auroraLightAcceptedNodeCount = 0;
  let auroraLightFlarePayloadNodeCount = 0;
  let auroraLightFlareRadiusWriteUnverified = false;
  let auroraLightBudgetStrategy: string | null = null;
  let auroraLightBudgetStrategySource: string | null = null;
  let auroraLightBudgetStrategyProofStatus: string | null = null;
  let auroraLightPreviewMode: string | null = null;
  const addLane = (value: unknown) => {
    if (typeof value === "string" && value.trim().length > 0) {
      drawLanes.add(value.trim());
    }
  };
  const addAuroraLightNode = (value: unknown) => {
    if (typeof value === "string" && value.trim().length > 0) {
      auroraLightNodes.add(value.trim());
    }
  };
  const readFiniteUserDataNumber = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const readUserDataString = (value: unknown): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  const collectAuroraLightMetrics = (data: THREE.Object3D["userData"] | undefined) => {
    if (!data) {
      return;
    }
    if (Array.isArray(data.auroraLightNodes)) {
      data.auroraLightNodes.forEach(addAuroraLightNode);
    }
    addAuroraLightNode(data.auroraLightNodeName);
    auroraLightSourceNodeCount = Math.max(
      auroraLightSourceNodeCount,
      readFiniteUserDataNumber(data.auroraLightSourceNodeCount) ?? 0
    );
    auroraLightAcceptedNodeCount = Math.max(
      auroraLightAcceptedNodeCount,
      readFiniteUserDataNumber(data.auroraLightAcceptedNodeCount) ?? 0
    );
    auroraLightFlarePayloadNodeCount = Math.max(
      auroraLightFlarePayloadNodeCount,
      readFiniteUserDataNumber(data.auroraLightFlarePayloadNodeCount) ?? 0
    );
    auroraLightFlareRadiusWriteUnverified =
      auroraLightFlareRadiusWriteUnverified ||
      data.auroraLightFlareRadiusWriteUnverified === true ||
      data.auroraLightFlareRadiusProofStatus === "source-token-preserved-write-target-unverified";
    auroraLightBudgetStrategy =
      auroraLightBudgetStrategy ?? readUserDataString(data.auroraLightBudgetStrategy);
    auroraLightBudgetStrategySource =
      auroraLightBudgetStrategySource ??
      readUserDataString(data.auroraLightBudgetStrategySource);
    auroraLightBudgetStrategyProofStatus =
      auroraLightBudgetStrategyProofStatus ??
      readUserDataString(data.auroraLightBudgetStrategyProofStatus);
    auroraLightPreviewMode =
      auroraLightPreviewMode ?? readUserDataString(data.auroraLightPreviewMode);
  };

  addLane(root?.userData?.auroraEmitterPackageSource);
  addLane(root?.userData?.auroraEmitterType);
  addLane(root?.userData?.auroraEmitterBlendMode);
  addLane(root?.userData?.auroraEmitterRenderMode);
  collectAuroraLightMetrics(root?.userData);

  root?.traverse((node) => {
    collectAuroraLightMetrics(node.userData);
    if (!(node instanceof THREE.Mesh) || !node.visible) {
      return;
    }
    drawParticles += 1;
    const positionAttribute = node.geometry.getAttribute("position");
    if (positionAttribute) {
      renderedVertices += positionAttribute.count;
    }
    addLane(node.userData?.auroraEmitterPackageSource);
    addLane(node.userData?.auroraEmitterType);
    addLane(node.userData?.auroraEmitterBlendMode);
    addLane(node.userData?.auroraEmitterRenderMode);
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    addLane(material?.userData?.auroraEmitterPackageSource);
    addLane(material?.userData?.auroraEmitterType);
    addLane(material?.userData?.auroraEmitterBlendMode);
    addLane(material?.userData?.auroraEmitterRenderMode);
  });

  return {
    drawParticles,
    renderedVertices,
    drawLanes: Array.from(drawLanes),
    auroraLightNodes: Array.from(auroraLightNodes),
    auroraLightSourceNodeCount,
    auroraLightAcceptedNodeCount,
    auroraLightFlarePayloadNodeCount,
    auroraLightFlareRadiusWriteUnverified,
    auroraLightBudgetStrategy,
    auroraLightBudgetStrategySource,
    auroraLightBudgetStrategyProofStatus,
    auroraLightPreviewMode
  };
}

function clearPlaceablesVfxPreviewDrawMetrics(runtime: RuntimeState): void {
  delete runtime.container.dataset.appVfxDrawMetricsStatus;
  delete runtime.container.dataset.appVfxDrawMetricsObjectId;
  delete runtime.container.dataset.appVfxDrawParticles;
  delete runtime.container.dataset.appVfxRenderedVertices;
  delete runtime.container.dataset.appVfxDrawLanes;
  delete runtime.container.dataset.appVfxDrawMetricsSource;
  delete runtime.container.dataset.appVfxAuroraLightStatus;
  delete runtime.container.dataset.appVfxAuroraLightNodes;
  delete runtime.container.dataset.appVfxAuroraLightSourceNodeCount;
  delete runtime.container.dataset.appVfxAuroraLightAcceptedNodeCount;
  delete runtime.container.dataset.appVfxAuroraLightFlarePayloadNodeCount;
  delete runtime.container.dataset.appVfxAuroraLightFlareRadiusWriteUnverified;
  delete runtime.container.dataset.appVfxAuroraLightBudgetStrategy;
  delete runtime.container.dataset.appVfxAuroraLightBudgetStrategySource;
  delete runtime.container.dataset.appVfxAuroraLightBudgetStrategyProofStatus;
  delete runtime.container.dataset.appVfxAuroraLightPreviewMode;
}

function writePlaceablesVfxPreviewDrawMetrics(
  runtime: RuntimeState,
  objectId: string,
  root: THREE.Object3D | null
): void {
  const target = findVfxPreviewFrameTarget(root);
  const metrics = readPlaceablesVfxPreviewDrawMetrics(target);
  runtime.container.dataset.appVfxDrawMetricsStatus =
    metrics.drawParticles > 0 || metrics.renderedVertices > 0 ? "ready" : "missing";
  runtime.container.dataset.appVfxDrawMetricsObjectId = objectId;
  runtime.container.dataset.appVfxDrawParticles = String(metrics.drawParticles);
  runtime.container.dataset.appVfxRenderedVertices = String(metrics.renderedVertices);
  runtime.container.dataset.appVfxDrawLanes = metrics.drawLanes.join("|");
  runtime.container.dataset.appVfxDrawMetricsSource = "workspace-vfx-preview-root";
  runtime.container.dataset.appVfxAuroraLightStatus =
    metrics.auroraLightAcceptedNodeCount > 0 || metrics.auroraLightNodes.length > 0
      ? "ready"
      : "missing";
  runtime.container.dataset.appVfxAuroraLightNodes = metrics.auroraLightNodes.join("|");
  runtime.container.dataset.appVfxAuroraLightSourceNodeCount = String(
    metrics.auroraLightSourceNodeCount
  );
  runtime.container.dataset.appVfxAuroraLightAcceptedNodeCount = String(
    metrics.auroraLightAcceptedNodeCount
  );
  runtime.container.dataset.appVfxAuroraLightFlarePayloadNodeCount = String(
    metrics.auroraLightFlarePayloadNodeCount
  );
  runtime.container.dataset.appVfxAuroraLightFlareRadiusWriteUnverified = String(
    metrics.auroraLightFlareRadiusWriteUnverified
  );
  runtime.container.dataset.appVfxAuroraLightBudgetStrategy =
    metrics.auroraLightBudgetStrategy ?? "";
  runtime.container.dataset.appVfxAuroraLightBudgetStrategySource =
    metrics.auroraLightBudgetStrategySource ?? "";
  runtime.container.dataset.appVfxAuroraLightBudgetStrategyProofStatus =
    metrics.auroraLightBudgetStrategyProofStatus ?? "";
  runtime.container.dataset.appVfxAuroraLightPreviewMode = metrics.auroraLightPreviewMode ?? "";
}

function writeSinglePlaceablesVfxPreviewDiagnostics(
  runtime: RuntimeState,
  visibleObjects: SceneObject[],
  renderPayloadsByObjectId: Record<string, PlaceableViewportRenderPayload> | null
): void {
  if (visibleObjects.length !== 1) {
    clearPlaceablesVfxPreviewDrawMetrics(runtime);
    return;
  }
  const object = visibleObjects[0];
  if (!object || !isPlaceablesVfxPreviewObject(object, renderPayloadsByObjectId?.[object.id])) {
    clearPlaceablesVfxPreviewDrawMetrics(runtime);
    return;
  }
  writePlaceablesVfxPreviewDrawMetrics(
    runtime,
    object.id,
    runtime.objectMeshById.get(object.id) ?? null
  );
}

function formatAreaObjectDatasetNumber(value: number, fractionDigits: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return value.toFixed(fractionDigits);
}

function formatAreaObjectOrderIndex(index: number): string {
  return String(Math.max(0, index) + 1).padStart(3, "0");
}

function resolveAreaObjectOrderKey(object: SceneObject, objectIndex: number): string {
  const prefix = object.source?.type === "aurora_git" ? "GIT" : "scene";
  return `${prefix}-${formatAreaObjectOrderIndex(objectIndex)}`;
}

function resolveAreaObjectDatasetSourceId(object: SceneObject): string {
  return object.source?.sourceObjectId ?? object.id;
}

function resolveAreaObjectDatasetPlacement(object: SceneObject): string {
  return [
    formatAreaObjectDatasetNumber(object.x, 2),
    formatAreaObjectDatasetNumber(object.y, 2),
    formatAreaObjectDatasetNumber(object.z, 2),
    formatAreaObjectDatasetNumber(object.bearing, 0)
  ].join(",");
}

function resolveAreaObjectDatasetEvidence(
  object: SceneObject,
  objectIndex: number
): string {
  return [
    resolveAreaObjectOrderKey(object, objectIndex),
    object.kind,
    object.source?.type ?? "local",
    resolveAreaObjectDatasetSourceId(object),
    object.source?.templateId ?? object.resRef,
    resolveAreaObjectDatasetPlacement(object)
  ].join(";");
}

function formatAreaObjectDoorTransitionValue(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "empty";
}

function formatAreaObjectDoorTransitionMap(
  values: Record<string, unknown> | undefined
): string {
  const entries = Object.entries(values ?? {});
  if (entries.length === 0) {
    return "none";
  }
  return entries
    .map(([key, value]) => `${key}=${value === null ? "null" : String(value)}`)
    .join(",");
}

function resolveAreaObjectDoorTransitionStatus(
  object: SceneObject
): "source-backed" | "empty-source-payload" | "missing-source-payload" | "not-applicable" {
  if (object.kind !== "doors") {
    return "not-applicable";
  }
  const transition = object.doorTransition;
  if (!transition) {
    return "missing-source-payload";
  }
  const hasSourceValue =
    transition.linkedTarget.trim().length > 0 ||
    transition.linkedModule.trim().length > 0 ||
    transition.linkedTag.trim().length > 0 ||
    transition.linkedWaypoint.trim().length > 0 ||
    transition.loadScreen.trim().length > 0 ||
    Object.keys(transition.flags).length > 0 ||
    Object.keys(transition.extra ?? {}).length > 0;
  return hasSourceValue ? "source-backed" : "empty-source-payload";
}

function resolveAreaObjectDoorTransitionEvidence(
  object: SceneObject,
  objectIndex: number
): string {
  const base = [
    resolveAreaObjectOrderKey(object, objectIndex),
    object.kind,
    object.source?.type ?? "local",
    resolveAreaObjectDatasetSourceId(object),
    object.source?.templateId ?? object.resRef,
    resolveAreaObjectDatasetPlacement(object)
  ];
  if (object.kind !== "doors") {
    return [
      ...base,
      "gitTransition=not-applicable",
      "sceneContract=not-applicable",
      "runtimeTransition=not-applicable",
      "dwkWok=not-applicable",
      "browserProof=not-applicable",
      "status=not-applicable"
    ].join(";");
  }
  const transition = object.doorTransition;
  if (!transition) {
    return [
      ...base,
      "gitTransition=missing-linkedto-transitiondestination-linkedtomodule-loadscreenid",
      "sceneContract=missing-doorTransition",
      "linkedTarget=missing",
      "linkedModule=missing",
      "transitionDestination=missing",
      "linkedWaypoint=missing",
      "loadScreen=missing",
      "flags=none",
      "extra=none",
      "runtimeTransition=blocked-preserve-only",
      "dwkWok=blocked",
      "browserProof=blocked",
      `status=${resolveAreaObjectDoorTransitionStatus(object)}`
    ].join(";");
  }
  return [
    ...base,
    "gitTransition=present",
    "sceneContract=doorTransition-preserved",
    `linkedTarget=${formatAreaObjectDoorTransitionValue(transition.linkedTarget)}`,
    `linkedModule=${formatAreaObjectDoorTransitionValue(transition.linkedModule)}`,
    `transitionDestination=${formatAreaObjectDoorTransitionValue(transition.linkedTag)}`,
    `linkedWaypoint=${formatAreaObjectDoorTransitionValue(transition.linkedWaypoint)}`,
    `loadScreen=${formatAreaObjectDoorTransitionValue(transition.loadScreen)}`,
    `flags=${formatAreaObjectDoorTransitionMap(transition.flags)}`,
    `extra=${formatAreaObjectDoorTransitionMap(transition.extra)}`,
    "runtimeTransition=blocked-preserve-only",
    "dwkWok=blocked",
    "browserProof=blocked",
    `status=${resolveAreaObjectDoorTransitionStatus(object)}`
  ].join(";");
}

function resolveAreaObjectDoorTransitionAggregateStatus(
  statuses: Array<"source-backed" | "empty-source-payload" | "missing-source-payload" | "not-applicable">
): string {
  const relevantStatuses = statuses.filter((status) => status !== "not-applicable");
  if (relevantStatuses.length === 0) {
    return statuses.length === 0 ? "none" : "not-applicable";
  }
  if (relevantStatuses.every((status) => status === "source-backed")) {
    return "source-backed";
  }
  if (relevantStatuses.some((status) => status === "source-backed")) {
    return "mixed";
  }
  if (relevantStatuses.every((status) => status === "empty-source-payload")) {
    return "empty-source-payload";
  }
  return "missing-source-payload";
}

function readAreaObjectPlaceableMetadataValue(
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

function resolveAreaObjectDoorTwoDaRowEvidence(
  payload: PlaceableViewportRenderPayload | null | undefined,
  metadataPrefix: "doortypes2da" | "genericdoors2da",
  missingRowReason: string
): string {
  const source = readAreaObjectPlaceableMetadataValue(payload, [`${metadataPrefix}SourceKey`]);
  const available = readAreaObjectPlaceableMetadataValue(payload, [`${metadataPrefix}Available`]);
  const row = readAreaObjectPlaceableMetadataValue(payload, [`${metadataPrefix}Row`]);
  const label = readAreaObjectPlaceableMetadataValue(payload, [`${metadataPrefix}Label`]);
  const model = readAreaObjectPlaceableMetadataValue(payload, [`${metadataPrefix}ModelResRef`]);
  if (row) {
    return [
      `row-${row}`,
      label ? `label-${label}` : "label-missing",
      model ? `model-${model}` : "model-missing",
      source ? `source-${source}` : "source-key-missing"
    ].join("/");
  }
  if (available === "true") {
    return source
      ? `source-indexed-${source}/${missingRowReason}`
      : `source-indexed/${missingRowReason}`;
  }
  if (source) {
    return `source-${source}/${missingRowReason}`;
  }
  return `blocked-missing-${metadataPrefix}-source`;
}

function resolveAreaObjectModelContractStatus(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined
): "ready" | "partial" | "blocked" | "not-applicable" {
  if (object.kind === "doors") {
    if (!payload) {
      return "blocked";
    }
    const renderState = resolvePlaceableRenderContractState(payload);
    const doorModel = readAreaObjectPlaceableMetadataValue(payload, [
      "doorLookupModelResRef",
      "genericdoors2daModelResRef",
      "doortypes2daModelResRef",
      "lookupModelResRef",
      "modelResRef"
    ]);
    return renderState.modelUrl || renderState.hasModelContract || doorModel ? "partial" : "blocked";
  }
  if (object.kind !== "placeables") {
    return "not-applicable";
  }
  if (!payload) {
    return "blocked";
  }

  const renderState = resolvePlaceableRenderContractState(payload);
  const sourceAppearanceType = resolveSceneObjectRenderAppearanceType(object);
  const hasSourceAppearance =
    typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType);
  const hasModelName = readAreaObjectPlaceableMetadataValue(payload, [
    "lookupModelResRef",
    "modelResRef",
    "reservedModelResRef",
    "modelName",
    "ModelName"
  ]) !== null;

  if (renderState.modelUrl && hasSourceAppearance && hasModelName) {
    return "ready";
  }
  if (renderState.modelUrl) {
    return "partial";
  }
  return "blocked";
}

function resolveAreaObjectModelContractEvidence(
  object: SceneObject,
  objectIndex: number,
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  const base = [
    resolveAreaObjectOrderKey(object, objectIndex),
    object.kind,
    object.source?.type ?? "local",
    resolveAreaObjectDatasetSourceId(object),
    object.source?.templateId ?? object.resRef
  ];

  if (object.kind === "placeables") {
    const renderState = payload ? resolvePlaceableRenderContractState(payload) : null;
    const sourceAppearanceType = resolveSceneObjectRenderAppearanceType(object);
    const appearanceType = payload?.placeable.placeableRuntime?.state?.appearanceType;
    const appearance =
      typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType)
        ? `git-appearance-${sourceAppearanceType}`
        : typeof appearanceType === "number" && Number.isFinite(appearanceType)
          ? `render-payload-${appearanceType}-area-git-missing`
          : "missing-area-git-appearance";
    const modelName =
      readAreaObjectPlaceableMetadataValue(payload, [
        "lookupModelResRef",
        "modelResRef",
        "reservedModelResRef",
        "modelName",
        "ModelName"
      ]) ?? "missing-placeables2da-modelname";
    const modelAsset = renderState?.modelUrl
      ? "model-url-ready"
      : renderState?.hasModelContract
        ? "model-contract-without-url"
        : "missing-model-asset-contract";
    return [
      ...base,
      "path=GITAppearance>placeables2daModelName>modelAsset",
      `appearance=${appearance}`,
      `modelName=${modelName}`,
      `modelAsset=${modelAsset}`,
      `status=${resolveAreaObjectModelContractStatus(object, payload)}`
    ].join(";");
  }

  if (object.kind === "doors") {
    const sourceAppearanceType = resolveSceneObjectRenderAppearanceType(object);
    const sourceGenericType = object.source?.genericType;
    const renderState = payload ? resolvePlaceableRenderContractState(payload) : null;
    const appearance =
      typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType)
        ? `git-appearance-${sourceAppearanceType}`
        : "missing-area-door-appearance";
    const genericType =
      typeof sourceGenericType === "number" && Number.isFinite(sourceGenericType)
        ? `git-generic-type-${sourceGenericType}`
        : "missing-source-generic-type";
    const templateSource =
      readAreaObjectPlaceableMetadataValue(payload, ["sourceObjectKey"]) ??
      "missing-utd-source";
    const utdAppearance =
      readAreaObjectPlaceableMetadataValue(payload, ["appearanceId"]) ??
      "missing-utd-appearance";
    const templateModel =
      readAreaObjectPlaceableMetadataValue(payload, [
        "doorLookupModelResRef",
        "genericdoors2daModelResRef",
        "doortypes2daModelResRef",
        "lookupModelResRef",
        "modelResRef",
        "modelName"
      ]) ?? "missing-utd-model";
    const modelAsset = renderState?.modelUrl
      ? "model-url-ready"
      : renderState?.hasModelContract
        ? "model-contract-without-url"
        : "missing-door-model-asset-contract";
    return [
      ...base,
      "path=templateAppearanceGenericType>doortypesGenericdoors>modelAsset",
      `appearance=${appearance}`,
      `genericType=${genericType}`,
      `utdSource=${templateSource}`,
      `utdAppearance=${utdAppearance}`,
      `templateModel=${templateModel}`,
      `doortypes=${resolveAreaObjectDoorTwoDaRowEvidence(
        payload,
        "doortypes2da",
        "missing-doortypes-row-for-utd-appearance"
      )}`,
      `genericdoors=${resolveAreaObjectDoorTwoDaRowEvidence(
        payload,
        "genericdoors2da",
        "missing-genericdoors-row-for-utd-generic-type"
      )}`,
      `modelAsset=${modelAsset}`,
      `status=${resolveAreaObjectModelContractStatus(object, payload)}`
    ].join(";");
  }

  return [...base, "path=not-applicable", "status=not-applicable"].join(";");
}

function resolveAreaObjectLookupContractStatus(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined
): "ready" | "partial" | "blocked" | "not-applicable" {
  if (object.kind === "doors") {
    const templateSource = readAreaObjectPlaceableMetadataValue(payload, ["sourceObjectKey"]);
    const utdAppearance = readAreaObjectPlaceableMetadataValue(payload, ["appearanceId"]);
    const model = readAreaObjectPlaceableMetadataValue(payload, [
      "doorLookupModelResRef",
      "genericdoors2daModelResRef",
      "doortypes2daModelResRef",
      "lookupModelResRef",
      "modelResRef"
    ]);
    const doortypesSource = readAreaObjectPlaceableMetadataValue(payload, [
      "doortypes2daSourceKey",
      "doortypes2daAvailable"
    ]);
    const genericdoorsSource = readAreaObjectPlaceableMetadataValue(payload, [
      "genericdoors2daSourceKey",
      "genericdoors2daAvailable"
    ]);
    const doortypesRow = readAreaObjectPlaceableMetadataValue(payload, ["doortypes2daRow"]);
    const genericdoorsRow = readAreaObjectPlaceableMetadataValue(payload, ["genericdoors2daRow"]);
    const hasSourceAppearance =
      typeof object.source?.appearanceType === "number" &&
      Number.isFinite(object.source.appearanceType);
    const hasSourceGenericType =
      typeof object.source?.genericType === "number" && Number.isFinite(object.source.genericType);
    if (model && hasSourceAppearance && hasSourceGenericType) {
      return "ready";
    }
    if (
      templateSource ||
      utdAppearance ||
      model ||
      doortypesSource ||
      genericdoorsSource ||
      doortypesRow ||
      genericdoorsRow ||
      hasSourceAppearance ||
      hasSourceGenericType
    ) {
      return "partial";
    }
    return "blocked";
  }
  if (object.kind !== "placeables") {
    return "not-applicable";
  }
  const source2da = readAreaObjectPlaceableMetadataValue(payload, ["source2da"]);
  const row = readAreaObjectPlaceableMetadataValue(payload, ["source2daRow", "appearanceId"]);
  const model = readAreaObjectPlaceableMetadataValue(payload, ["lookupModelResRef", "modelResRef"]);
  if (source2da && row && model) {
    return "ready";
  }
  if (model) {
    return "partial";
  }
  return "blocked";
}

function resolveAreaObjectLookupContractEvidence(
  object: SceneObject,
  objectIndex: number,
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  const base = [
    resolveAreaObjectOrderKey(object, objectIndex),
    object.kind,
    object.source?.type ?? "local",
    resolveAreaObjectDatasetSourceId(object),
    object.source?.templateId ?? object.resRef
  ];

  if (object.kind === "placeables") {
    const sourceAppearanceType = resolveSceneObjectRenderAppearanceType(object);
    const appearance =
      typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType)
        ? `git-appearance-${sourceAppearanceType}`
        : "missing-area-git-appearance";
    const source2da =
      readAreaObjectPlaceableMetadataValue(payload, ["source2da"]) ?? "missing-source2da";
    const row =
      readAreaObjectPlaceableMetadataValue(payload, ["source2daRow", "appearanceId"]) ??
      "missing-row";
    const model =
      readAreaObjectPlaceableMetadataValue(payload, ["lookupModelResRef", "modelResRef"]) ??
      "missing-model";
    const template =
      readAreaObjectPlaceableMetadataValue(payload, [
        "lookupTemplateResRef",
        "templateResRef"
      ]) ?? "missing-template";
    const dependencyCount =
      readAreaObjectPlaceableMetadataValue(payload, [
        "lookupDependencyCount",
        "dependencyCount"
      ]) ?? "missing-dependency-count";
    return [
      ...base,
      "path=GITAppearance>placeables2da>ModelName>modelAsset",
      `appearance=${appearance}`,
      `source2da=${source2da}`,
      `row=${row}`,
      `template=${template}`,
      `model=${model}`,
      `dependencies=${dependencyCount}`,
      `status=${resolveAreaObjectLookupContractStatus(object, payload)}`
    ].join(";");
  }

  if (object.kind === "doors") {
    const sourceAppearanceType = object.source?.appearanceType;
    const sourceGenericType = object.source?.genericType;
    const renderState = payload ? resolvePlaceableRenderContractState(payload) : null;
    const appearance =
      typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType)
        ? `git-appearance-${sourceAppearanceType}`
        : "missing-area-door-appearance";
    const genericType =
      typeof sourceGenericType === "number" && Number.isFinite(sourceGenericType)
        ? `git-generic-type-${sourceGenericType}`
        : "missing-source-generic-type";
    const templateSource =
      readAreaObjectPlaceableMetadataValue(payload, ["sourceObjectKey"]) ??
      "missing-utd-source";
    const template =
      readAreaObjectPlaceableMetadataValue(payload, [
        "templateResRef",
        "lookupTemplateResRef"
      ]) ?? "missing-utd-template";
    const utdAppearance =
      readAreaObjectPlaceableMetadataValue(payload, ["appearanceId"]) ??
      "missing-utd-appearance";
    const model =
      readAreaObjectPlaceableMetadataValue(payload, [
        "doorLookupModelResRef",
        "genericdoors2daModelResRef",
        "doortypes2daModelResRef",
        "lookupModelResRef",
        "modelResRef"
      ]) ??
      "missing-utd-model";
    const modelAsset = renderState?.modelUrl
      ? "model-url-ready"
      : renderState?.hasModelContract
        ? "model-contract-without-url"
        : "missing-door-model-asset-contract";
    return [
      ...base,
      "path=templateAppearanceGenericType>doortypes2da>genericdoors2da>modelAsset",
      `appearance=${appearance}`,
      `genericType=${genericType}`,
      `utdSource=${templateSource}`,
      `utdTemplate=${template}`,
      `utdAppearance=${utdAppearance}`,
      `utdModel=${model}`,
      `doortypes=${resolveAreaObjectDoorTwoDaRowEvidence(
        payload,
        "doortypes2da",
        "missing-doortypes-row-for-utd-appearance"
      )}`,
      `genericdoors=${resolveAreaObjectDoorTwoDaRowEvidence(
        payload,
        "genericdoors2da",
        "missing-genericdoors-row-for-utd-generic-type"
      )}`,
      `modelAsset=${modelAsset}`,
      `status=${resolveAreaObjectLookupContractStatus(object, payload)}`
    ].join(";");
  }

  return [...base, "path=not-applicable", "status=not-applicable"].join(";");
}

function resolveAreaObjectSelectedModelContractStatus(
  statuses: Array<"ready" | "partial" | "blocked" | "not-applicable">
): string {
  const relevantStatuses = statuses.filter((status) => status !== "not-applicable");
  if (relevantStatuses.length === 0) {
    return statuses.length === 0 ? "none" : "not-applicable";
  }
  if (relevantStatuses.every((status) => status === "ready")) {
    return "ready";
  }
  if (relevantStatuses.some((status) => status === "ready" || status === "partial")) {
    return "mixed";
  }
  return "blocked";
}

function isAreaObjectBackendRenderContractTarget(object: SceneObject): boolean {
  return (
    object.source?.type === "aurora_git" &&
    (object.kind === "placeables" || object.kind === "doors")
  );
}

function createAreaPlaceablePlaceholderReasonCounts(): Record<
  AreaPlaceablePlaceholderReason,
  number
> {
  return Object.fromEntries(
    AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [reason, 0])
  ) as Record<AreaPlaceablePlaceholderReason, number>;
}

function createAreaPlaceablePlaceholderReasonIds(): Record<
  AreaPlaceablePlaceholderReason,
  string[]
> {
  return AREA_PLACEABLE_PLACEHOLDER_REASONS.reduce(
    (idsByReason, reason) => {
      idsByReason[reason] = [];
      return idsByReason;
    },
    {} as Record<AreaPlaceablePlaceholderReason, string[]>
  );
}

function resolveAreaObjectBackendRenderContractDiagnostics(
  visibleObjects: SceneObject[],
  placeableRenderPayloadsByObjectId: Record<string, PlaceableViewportRenderPayload> | null,
  modelLoadFailedObjectIds: ReadonlySet<string> = new Set(),
  sharedRendererRuntimeEvidenceByObjectId?: ReadonlyMap<
    string,
    {
      geometryStatus: string;
      placeholderReason: AreaPlaceablePlaceholderReason;
      modelUrl: string;
      modelCacheKey: string;
    }
  >
): {
  total: number;
  payloadReadyCount: number;
  modelUrlReadyCount: number;
  modelReadyCount: number;
  uniqueModelUrlCount: number;
  uniqueModelCacheKeyCount: number;
  modelUrlSample: string;
  modelCacheKeySample: string;
  blockedCount: number;
  primitiveFallbackCount: number;
  primitiveFallbackRenderLimit: number;
  primitiveFallbackSuppressedCount: number;
  status: "none" | "ready" | "partial" | "blocked";
  placeholderStatus: "none" | "ready" | "partial" | "blocked";
  blockedIds: string;
  missingPayloadIds: string;
  payloadMissingModelUrlIds: string;
  assetContractBlockedIds: string;
  modelLoadFailedIds: string;
  modelLoadFailedModelUrls: string;
  modelLoadFailedModelCacheKeys: string;
  stillLoadingIds: string;
  primitiveFallbackIds: string;
  placeholderReasonCounts: Record<AreaPlaceablePlaceholderReason, number>;
  placeholderReasonIds: Record<AreaPlaceablePlaceholderReason, string>;
} {
  const targets = visibleObjects.filter(isAreaObjectBackendRenderContractTarget);
  let payloadReadyCount = 0;
  let modelUrlReadyCount = 0;
  let modelReadyCount = 0;
  const modelUrls = new Set<string>();
  const modelCacheKeys = new Set<string>();
  const blockedIds: string[] = [];
  const missingPayloadIds: string[] = [];
  const primitiveFallbackIds: string[] = [];
  const modelLoadFailedModelUrls = new Set<string>();
  const modelLoadFailedModelCacheKeys = new Set<string>();
  const placeholderReasonCounts = createAreaPlaceablePlaceholderReasonCounts();
  const placeholderReasonIds = createAreaPlaceablePlaceholderReasonIds();

  targets.forEach((object) => {
    const payload = placeableRenderPayloadsByObjectId?.[object.id] ?? null;
    if (!payload) {
      const reason = resolveAreaPlaceablePlaceholderReason({
        sharedRendererTarget: true,
        payload: null
      });
      placeholderReasonCounts[reason] += 1;
      placeholderReasonIds[reason].push(object.id);
      blockedIds.push(object.id);
      missingPayloadIds.push(object.id);
      primitiveFallbackIds.push(object.id);
      return;
    }

    payloadReadyCount += 1;
    const renderState = resolvePlaceableRenderContractState(payload);
    let reason = resolveAreaPlaceablePlaceholderReason({
      sharedRendererTarget: true,
      payload,
      renderState,
      modelLoadFailed: modelLoadFailedObjectIds.has(object.id)
    });
    const runtimeEvidence = sharedRendererRuntimeEvidenceByObjectId?.get(object.id) ?? null;
    if (
      runtimeEvidence &&
      renderState.modelUrl &&
      !renderState.fallbackToPrimitive &&
      !modelLoadFailedObjectIds.has(object.id)
    ) {
      if (runtimeEvidence.geometryStatus === "model-url-ready") {
        reason = "none";
      } else if (runtimeEvidence.geometryStatus === "model-load-failed") {
        reason = "model-load-failed";
      } else if (runtimeEvidence.geometryStatus === "still-loading") {
        reason = "still-loading";
      }
    }
    placeholderReasonCounts[reason] += 1;
    placeholderReasonIds[reason].push(object.id);
    if (reason === "model-load-failed") {
      const failedModelUrl = runtimeEvidence?.modelUrl || renderState.modelUrl || "";
      const failedModelCacheKey =
        runtimeEvidence?.modelCacheKey || renderState.modelCacheKey || "";
      if (failedModelUrl) {
        modelLoadFailedModelUrls.add(failedModelUrl);
      }
      if (failedModelCacheKey) {
        modelLoadFailedModelCacheKeys.add(failedModelCacheKey);
      }
    }
    if (reason === "not-applicable") {
      return;
    }
    if (renderState.modelUrl && !renderState.fallbackToPrimitive) {
      modelUrlReadyCount += 1;
      modelUrls.add(renderState.modelUrl);
      if (renderState.modelCacheKey) {
        modelCacheKeys.add(renderState.modelCacheKey);
      }
      if (reason === "none") {
        modelReadyCount += 1;
        return;
      }
    }

    blockedIds.push(object.id);
    if (reason !== "none") {
      primitiveFallbackIds.push(object.id);
    }
  });

  const total = targets.length;
  const blockedCount = blockedIds.length;
  const notApplicableCount = placeholderReasonCounts["not-applicable"];
  const status =
    total === 0
      ? "none"
      : blockedCount === 0 && modelUrlReadyCount + notApplicableCount === total
        ? "ready"
        : payloadReadyCount > 0 || modelUrlReadyCount > 0
          ? "partial"
          : "blocked";
  const placeholderNonReadyCount =
    placeholderReasonCounts["still-loading"] +
    placeholderReasonCounts["missing-payload"] +
    placeholderReasonCounts["payload-missing-model-url"] +
    placeholderReasonCounts["asset-contract-blocked"] +
    placeholderReasonCounts["model-load-failed"];
  const placeholderStatus =
    total === 0
      ? "none"
      : placeholderNonReadyCount === 0
        ? "ready"
        : placeholderNonReadyCount < total
          ? "partial"
          : "blocked";

  return {
    total,
    payloadReadyCount,
    modelUrlReadyCount,
    modelReadyCount,
    uniqueModelUrlCount: modelUrls.size,
    uniqueModelCacheKeyCount: modelCacheKeys.size,
    modelUrlSample: Array.from(modelUrls).slice(0, AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT).join("|"),
    modelCacheKeySample: Array.from(modelCacheKeys).slice(0, AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT).join("|"),
    blockedCount,
    primitiveFallbackCount: primitiveFallbackIds.length,
    primitiveFallbackRenderLimit: AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT,
    primitiveFallbackSuppressedCount: Math.max(
      0,
      primitiveFallbackIds.length - AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT
    ),
    status,
    placeholderStatus,
    blockedIds: blockedIds.join("|"),
    missingPayloadIds: missingPayloadIds.join("|"),
    payloadMissingModelUrlIds: placeholderReasonIds["payload-missing-model-url"].join("|"),
    assetContractBlockedIds: placeholderReasonIds["asset-contract-blocked"].join("|"),
    modelLoadFailedIds: placeholderReasonIds["model-load-failed"].join("|"),
    modelLoadFailedModelUrls: Array.from(modelLoadFailedModelUrls).join("|"),
    modelLoadFailedModelCacheKeys: Array.from(modelLoadFailedModelCacheKeys).join("|"),
    stillLoadingIds: placeholderReasonIds["still-loading"].join("|"),
    primitiveFallbackIds: primitiveFallbackIds.join("|"),
    placeholderReasonCounts,
    placeholderReasonIds: Object.fromEntries(
      AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
        reason,
        placeholderReasonIds[reason].join("|")
      ])
    ) as Record<AreaPlaceablePlaceholderReason, string>
  };
}

function splitAreaRuntimeIdList(value: string): string[] {
  return value
    .split("|")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function splitLimitedAreaRuntimeIdList(
  value: string,
  limit = AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
): string[] {
  return limitAreaRuntimeIdList(splitAreaRuntimeIdList(value), limit);
}

function joinLimitedAreaRuntimeIds(
  ids: string[],
  limit = AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
): string {
  return limitAreaRuntimeIdList(ids, limit).join("|");
}

function limitAreaRuntimeIdString(
  value: string,
  limit = AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
): string {
  return splitLimitedAreaRuntimeIdList(value, limit).join("|");
}

function countAreaRuntimeIdList(value: string): number {
  return splitAreaRuntimeIdList(value).length;
}

function collectAreaObjectSharedRendererRuntimeEvidenceByObjectId(
  runtime: RuntimeState,
  visibleObjects: SceneObject[]
): Map<
  string,
  {
    geometryStatus: string;
    placeholderReason: AreaPlaceablePlaceholderReason;
    modelUrl: string;
    modelCacheKey: string;
  }
> {
  const evidenceByObjectId = new Map<
    string,
    {
      geometryStatus: string;
      placeholderReason: AreaPlaceablePlaceholderReason;
      modelUrl: string;
      modelCacheKey: string;
    }
  >();
  visibleObjects.forEach((object) => {
    const root = runtime.objectMeshById.get(object.id);
    const userData = root?.userData;
    if (
      userData?.auroraAreaObjectSharedRendererRuntimeMarker !==
      "shared-placeables-renderer"
    ) {
      return;
    }
    const geometryStatus = userData.auroraAreaObjectSharedRendererGeometryStatus;
    const placeholderReason = userData.auroraAreaObjectSharedRendererPlaceholderReason;
    if (typeof geometryStatus !== "string" || typeof placeholderReason !== "string") {
      return;
    }
    evidenceByObjectId.set(object.id, {
      geometryStatus,
      placeholderReason: placeholderReason as AreaPlaceablePlaceholderReason,
      modelUrl:
        typeof userData.auroraAreaObjectSharedRendererModelUrl === "string"
          ? userData.auroraAreaObjectSharedRendererModelUrl
          : typeof userData.renderPackageModelUrl === "string"
            ? userData.renderPackageModelUrl
            : "",
      modelCacheKey:
        typeof userData.renderPackageModelCacheKey === "string"
          ? userData.renderPackageModelCacheKey
          : ""
    });
  });
  return evidenceByObjectId;
}

export function formatAreaSharedRendererIssueSummary(
  diagnostics: ReturnType<typeof resolveAreaObjectBackendRenderContractDiagnostics>,
  options: { payloadRequestsInFlight?: boolean } = {}
): string {
  const missingPayloadCount = countAreaRuntimeIdList(diagnostics.missingPayloadIds);
  return [
    `${diagnostics.primitiveFallbackCount}/${diagnostics.total} primitive fallback`,
    diagnostics.primitiveFallbackSuppressedCount > 0
      ? `render capped ${diagnostics.primitiveFallbackRenderLimit}, skipped ${diagnostics.primitiveFallbackSuppressedCount}`
      : "",
    missingPayloadCount > 0
      ? options.payloadRequestsInFlight
        ? `payloads pending/in flight ${missingPayloadCount}`
        : `missing payloads ${missingPayloadCount}`
      : ""
  ]
    .filter(Boolean)
    .join(" / ");
}

function readAreaRenderFrameMirrorLayer(
  layer: RuntimeState["objectLayer"]
): AreaRenderFrameMirrorLayerSnapshot {
  const mirror =
    typeof layer.userData.auroraAreaRenderFrameMirror === "string"
      ? layer.userData.auroraAreaRenderFrameMirror
      : null;
  const mirrorWidth = Number(layer.userData.auroraAreaRenderFrameMirrorWidth);
  return {
    mirror,
    mirrorWidth: Number.isFinite(mirrorWidth) ? roundAreaRuntimeNumber(mirrorWidth) : null,
    positionX: roundAreaRuntimeNumber(Number(layer.position.x)),
    scaleX: roundAreaRuntimeNumber(Number(layer.scale.x))
  };
}

function resolveAreaRenderFrameMirrorSnapshot(
  runtime: RuntimeState
): AreaRenderFrameMirrorSnapshot {
  const objectLayer = readAreaRenderFrameMirrorLayer(runtime.objectLayer);
  const boundsLayer = readAreaRenderFrameMirrorLayer(runtime.boundsLayer);
  const enabled =
    objectLayer.mirror === "coordinate-x" &&
    boundsLayer.mirror === "coordinate-x" &&
    objectLayer.mirrorWidth !== null &&
    boundsLayer.mirrorWidth !== null &&
    Math.abs(objectLayer.mirrorWidth - boundsLayer.mirrorWidth) <= 1e-6 &&
    objectLayer.positionX === objectLayer.mirrorWidth &&
    boundsLayer.positionX === boundsLayer.mirrorWidth &&
    objectLayer.scaleX < 0 &&
    boundsLayer.scaleX < 0;
  const disabled =
    objectLayer.mirror === null &&
    boundsLayer.mirror === null &&
    objectLayer.positionX === 0 &&
    boundsLayer.positionX === 0 &&
    objectLayer.scaleX === 1 &&
    boundsLayer.scaleX === 1;
  return {
    status: enabled ? "coordinate-x" : disabled ? "disabled" : "partial",
    enabled,
    objectLayer,
    boundsLayer
  };
}

export function resolveAreaRenderFrameMirrorSnapshotForTests(
  runtime: RuntimeState
): AreaRenderFrameMirrorSnapshot {
  return resolveAreaRenderFrameMirrorSnapshot(runtime);
}

function writeAreaSharedRendererRuntimeSnapshot(
  runtime: RuntimeState,
  diagnostics: ReturnType<typeof resolveAreaObjectBackendRenderContractDiagnostics>
): void {
  const existingSnapshot = readAreaSharedRendererRuntimeSnapshot(runtime);
  const modelBoundsSample = existingSnapshot?.modelBoundsSample ?? [];
  const visualTransformSample = existingSnapshot?.visualTransformSample ?? [];
  const objectVisualTransformSample = existingSnapshot?.objectVisualTransformSample ?? [];
  const objectVisualTransformRootCount = existingSnapshot?.objectVisualTransformRootCount ?? 0;
  const objectVisualTransformAppliedCount =
    existingSnapshot?.objectVisualTransformAppliedCount ?? 0;
  const objectVisualTransformAppliedIds =
    existingSnapshot?.objectVisualTransformAppliedIds ?? [];
  const areaRenderFrameMirror = resolveAreaRenderFrameMirrorSnapshot(runtime);
  const snapshot: AreaSharedRendererRuntimeSnapshot = {
    version: "aurora-areas-shared-renderer-runtime/v1",
    path: "shared-placeables-renderer",
    status: diagnostics.status,
    placeholderStatus: diagnostics.placeholderStatus,
    total: diagnostics.total,
    payloadBoundCount: diagnostics.payloadReadyCount,
    modelReadyCount: diagnostics.modelReadyCount,
    uniqueModelUrlCount: diagnostics.uniqueModelUrlCount,
    uniqueModelCacheKeyCount: diagnostics.uniqueModelCacheKeyCount,
    modelUrlSample: splitLimitedAreaRuntimeIdList(diagnostics.modelUrlSample),
    modelCacheKeySample: splitLimitedAreaRuntimeIdList(diagnostics.modelCacheKeySample),
    primitiveFallbackCount: diagnostics.primitiveFallbackCount,
    primitiveFallbackRenderLimit: diagnostics.primitiveFallbackRenderLimit,
    primitiveFallbackSuppressedCount: diagnostics.primitiveFallbackSuppressedCount,
    placeholderReasonCounts: diagnostics.placeholderReasonCounts,
    placeholderReasonIds: Object.fromEntries(
      AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
        reason,
        splitLimitedAreaRuntimeIdList(diagnostics.placeholderReasonIds[reason])
      ])
    ) as Record<AreaPlaceablePlaceholderReason, string[]>,
    missingPayloadIds: splitLimitedAreaRuntimeIdList(diagnostics.missingPayloadIds),
    payloadMissingModelUrlIds: splitLimitedAreaRuntimeIdList(diagnostics.payloadMissingModelUrlIds),
    assetContractBlockedIds: splitLimitedAreaRuntimeIdList(diagnostics.assetContractBlockedIds),
    modelLoadFailedIds: splitLimitedAreaRuntimeIdList(diagnostics.modelLoadFailedIds),
    modelLoadFailedModelUrls: splitLimitedAreaRuntimeIdList(
      diagnostics.modelLoadFailedModelUrls
    ),
    modelLoadFailedModelCacheKeys: splitLimitedAreaRuntimeIdList(
      diagnostics.modelLoadFailedModelCacheKeys
    ),
    stillLoadingIds: splitLimitedAreaRuntimeIdList(diagnostics.stillLoadingIds),
    primitiveFallbackIds: splitLimitedAreaRuntimeIdList(diagnostics.primitiveFallbackIds),
    textureStatusCounts: {},
    texturePendingIds: [],
    textureIssueIds: [],
    textureMissingIds: [],
    textureFallbackIds: [],
    textureSkippedIds: [],
    toolsetPhysicalHiddenIds: [],
    toolsetPhysicalHiddenReasons: [],
    blockedIds: splitLimitedAreaRuntimeIdList(diagnostics.blockedIds),
    areaRenderFrameMirror,
    objectVisualTransformRootCount,
    objectVisualTransformAppliedCount,
    objectVisualTransformAppliedIds,
    objectVisualTransformSample,
    visualTransformSample,
    modelBoundsSample
  };
  runtime.container.dataset.areaObjectSharedRendererAreaRenderFrameMirror =
    JSON.stringify(areaRenderFrameMirror);
  runtime.container.dataset.areaObjectSharedRendererModelBoundsSample =
    JSON.stringify(modelBoundsSample);
  runtime.container.dataset.areaObjectSharedRendererVisualTransformSample =
    JSON.stringify(visualTransformSample);
  runtime.container.dataset.areaObjectSharedRendererVisualTransformSampleCount =
    String(visualTransformSample.length);
  runtime.container.dataset.areaObjectVisualTransformSample =
    JSON.stringify(objectVisualTransformSample);
  runtime.container.dataset.areaObjectVisualTransformSampleCount =
    String(objectVisualTransformSample.length);
  runtime.container.dataset.areaObjectVisualTransformRootCount =
    String(objectVisualTransformRootCount);
  runtime.container.dataset.areaObjectVisualTransformAppliedCount =
    String(objectVisualTransformAppliedCount);
  runtime.container.dataset.areaObjectVisualTransformAppliedIds =
    joinLimitedAreaRuntimeIds(objectVisualTransformAppliedIds);
  runtime.container.dataset.areaObjectSharedRendererModelBoundsSampleCount =
    String(modelBoundsSample.length);
  runtime.container.dataset.areaObjectSharedRendererSnapshot = JSON.stringify(snapshot);
  runtime.container.dispatchEvent(
    new CustomEvent<AreaSharedRendererRuntimeSnapshot>(AREA_SHARED_RENDERER_SNAPSHOT_EVENT, {
      detail: snapshot
    })
  );
}

function refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime: RuntimeState): void {
  const rawSnapshot = runtime.container.dataset.areaObjectSharedRendererSnapshot;
  if (!rawSnapshot) {
    return;
  }
  let snapshot: AreaSharedRendererRuntimeSnapshot | null = null;
  try {
    snapshot = JSON.parse(rawSnapshot) as AreaSharedRendererRuntimeSnapshot;
  } catch {
    return;
  }
  if (snapshot.version !== "aurora-areas-shared-renderer-runtime/v1") {
    return;
  }

  const placeholderReasonIds = createAreaPlaceablePlaceholderReasonIds();
  const modelLoadFailedModelUrls = new Set<string>();
  const modelLoadFailedModelCacheKeys = new Set<string>();
  const textureStatusCounts: Record<string, number> = {};
  const texturePendingIds: string[] = [];
  const texturePartialIds: string[] = [];
  const textureMissingIds: string[] = [];
  const textureFallbackIds: string[] = [];
  const textureSkippedIds: string[] = [];
  const toolsetPhysicalHiddenIds: string[] = [];
  const toolsetPhysicalHiddenReasons: string[] = [];
  const objectVisualTransformSampleEntries: AreaSharedRendererVisualTransformSampleEntry[] = [];
  const objectVisualTransformAppliedIds: string[] = [];
  const visualTransformSampleEntries: AreaSharedRendererVisualTransformSampleEntry[] = [];
  const modelBoundsEntries: AreaSharedRendererModelBoundsSampleEntry[] = [];
  const refreshedObjectIds = new Set<string>();
  const sharedRendererRootSample: string[] = [];
  const sharedRendererRootEvaluationSample: string[] = [];
  let objectVisualTransformRootCount = 0;
  let objectVisualTransformAppliedCount = 0;
  let sharedRendererRootCount = 0;
  let sharedRendererRootWithChildrenCount = 0;
  let sharedRendererRootChildCount = 0;
  let sharedRendererRootMeshDescendantCount = 0;
  let sharedRendererBoundsCandidateCount = 0;
  runtime.objectMeshById.forEach((root, fallbackObjectId) => {
    objectVisualTransformRootCount += 1;
    const userData = root.userData;
    const objectId =
      typeof userData.objectId === "string" && userData.objectId.length > 0
        ? userData.objectId
        : fallbackObjectId;
    const objectKind = readAreaRuntimeUserDataString(userData, "objectKind");
    const sourceId = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectSourceId"
    );
    const templateId = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectTemplateId"
    );
    const payloadStatus =
      readAreaRuntimeUserDataString(
        userData,
        "auroraAreaObjectSharedRendererPayloadStatus"
      ) || readAreaRuntimeUserDataString(userData, "auroraAreaObjectPayloadStatus");
    const geometryStatus =
      readAreaRuntimeUserDataString(
        userData,
        "auroraAreaObjectSharedRendererGeometryStatus"
      ) || (root.children.length > 0 ? "object-root" : "empty-root");
    const rawPlaceholderReason = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectSharedRendererPlaceholderReason"
    );
    const rendererPath =
      userData.auroraAreaObjectSharedRendererRuntimeMarker ===
      "shared-placeables-renderer"
        ? "shared-placeables-renderer"
        : "object-layer";
    const visualTransform = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectVisualTransform"
    );
    const effectiveVisualTransform = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectEffectiveVisualTransform"
    );
    const visualTransformApplied =
      userData.auroraAreaObjectVisualTransformApplied === true;
    if (visualTransformApplied) {
      objectVisualTransformAppliedCount += 1;
      objectVisualTransformAppliedIds.push(objectId);
    }
    if (
      objectVisualTransformSampleEntries.length < AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT &&
      (visualTransformApplied ||
        visualTransform.trim().length > 0 ||
        effectiveVisualTransform.trim().length > 0)
    ) {
      objectVisualTransformSampleEntries.push({
        objectId,
        objectKind,
        rendererPath,
        sourceId,
        templateId,
        payloadStatus,
        geometryStatus,
        placeholderReason:
          rawPlaceholderReason.trim().length > 0
            ? rawPlaceholderReason
            : rendererPath,
        visualTransform,
        effectiveVisualTransform,
        visualTransformApplied,
        rootPosition: formatAreaRuntimeVector(root.position),
        rootRotation: formatAreaRuntimeVector(root.rotation),
        rootScale: formatAreaRuntimeVector(root.scale),
        renderTransform: readAreaRuntimeRenderTransformEvidence(userData)
      });
    }
  });
  runtime.objectMeshById.forEach((root, fallbackObjectId) => {
    const userData = root.userData;
    if (
      userData?.auroraAreaObjectSharedRendererRuntimeMarker !==
      "shared-placeables-renderer"
    ) {
      return;
    }
    sharedRendererRootCount += 1;
    if (root.children.length > 0) {
      sharedRendererRootWithChildrenCount += 1;
    }
    sharedRendererRootChildCount += root.children.length;
    let rootMeshDescendantCount = 0;
    root.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        sharedRendererRootMeshDescendantCount += 1;
        rootMeshDescendantCount += 1;
      }
    });
    const objectId =
      typeof userData.objectId === "string" && userData.objectId.length > 0
        ? userData.objectId
        : fallbackObjectId;
    const modelUrl =
      typeof userData.auroraAreaObjectSharedRendererModelUrl === "string"
        ? userData.auroraAreaObjectSharedRendererModelUrl
        : typeof userData.renderPackageModelUrl === "string"
          ? userData.renderPackageModelUrl
          : "";
    const modelCacheKey =
      typeof userData.renderPackageModelCacheKey === "string"
        ? userData.renderPackageModelCacheKey
        : "";
    const rawReason = userData.auroraAreaObjectSharedRendererPlaceholderReason;
    let reason = AREA_PLACEABLE_PLACEHOLDER_REASONS.includes(
      rawReason as AreaPlaceablePlaceholderReason
    )
      ? (rawReason as AreaPlaceablePlaceholderReason)
      : "not-applicable";
    if (sharedRendererRootSample.length < AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT) {
      const modelLabel = modelUrl.split(/[\\/]/u).pop()?.slice(0, 64) ?? "";
      sharedRendererRootSample.push(
        [
          `id=${objectId}`,
          `kind=${typeof userData.objectKind === "string" ? userData.objectKind : ""}`,
          `type=${root.type}`,
          `reason=${reason}`,
          `geometry=${typeof userData.auroraAreaObjectSharedRendererGeometryStatus === "string" ? userData.auroraAreaObjectSharedRendererGeometryStatus : ""}`,
          `children=${root.children.length}`,
          `meshes=${rootMeshDescendantCount}`,
          `model=${modelLabel}`
        ].join(",")
      );
    }
    refreshedObjectIds.add(objectId);
    let textureStatus =
      typeof userData.auroraAreaObjectSharedRendererTextureStatus === "string" &&
      userData.auroraAreaObjectSharedRendererTextureStatus.trim().length > 0
        ? userData.auroraAreaObjectSharedRendererTextureStatus.trim()
        : "unknown";
    const modelBounds =
      typeof userData.auroraAreaObjectSharedRendererModelBounds === "string"
        ? userData.auroraAreaObjectSharedRendererModelBounds
        : "";
    const modelMaxAxis = Number(
      userData.auroraAreaObjectSharedRendererModelMaxAxis
    );
    const modelMeshCount = Number(
      userData.auroraAreaObjectSharedRendererModelMeshCount
    );
    const hasModelBoundsEvidence =
      modelBounds.trim().length > 0 ||
      (Number.isFinite(modelMaxAxis) && modelMaxAxis > 0) ||
      (Number.isFinite(modelMeshCount) && modelMeshCount > 0);
    const toolsetPhysicalVisibility =
      resolveAreaRuntimeToolsetPhysicalVisibility(root);
    if (toolsetPhysicalVisibility.hidden) {
      toolsetPhysicalHiddenIds.push(objectId);
      toolsetPhysicalHiddenReasons.push(
        [
          `id=${objectId}`,
          `reason=${toolsetPhysicalVisibility.reason}`,
          `source=${toolsetPhysicalVisibility.source}`
        ].join(",")
      );
    }
    root.updateWorldMatrix(true, true);
    const rawWorldBounds = new THREE.Box3().setFromObject(root);
    const visibleWorldBounds = resolveAreaRuntimeVisibleWorldBounds(root);
    const worldBounds =
      root.visible && !visibleWorldBounds.isEmpty()
        ? visibleWorldBounds
        : root.visible && !toolsetPhysicalVisibility.hidden
          ? rawWorldBounds
          : new THREE.Box3();
    const hasRenderableWorldBounds = !worldBounds.isEmpty();
    if (hasModelBoundsEvidence || hasRenderableWorldBounds) {
      sharedRendererBoundsCandidateCount += 1;
    }
    const rawReasonLabel = reason;
    if (reason === "still-loading" && hasRenderableWorldBounds) {
      reason = "none";
    }
    if (sharedRendererRootEvaluationSample.length < AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT) {
      sharedRendererRootEvaluationSample.push(
        [
          `id=${objectId}`,
          `raw=${rawReasonLabel}`,
          `final=${reason}`,
          `children=${root.children.length}`,
          `meshes=${rootMeshDescendantCount}`,
          `toolsetPhysical=${toolsetPhysicalVisibility.hidden ? "hidden" : "visible"}`,
          `hasModelBounds=${hasModelBoundsEvidence ? "true" : "false"}`,
          `hasWorldBounds=${hasRenderableWorldBounds ? "true" : "false"}`
        ].join(",")
      );
    }
    placeholderReasonIds[reason].push(objectId);
    const sourceId = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectSourceId"
    );
    const templateId = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectTemplateId"
    );
    const payloadStatus = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectPayloadStatus"
    );
    const geometryStatus = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectSharedRendererGeometryStatus"
    );
    const visualTransform = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectVisualTransform"
    );
    const effectiveVisualTransform = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectEffectiveVisualTransform"
    );
    const renderTransform = readAreaRuntimeRenderTransformEvidence(userData);
    if (visualTransformSampleEntries.length < AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT) {
      visualTransformSampleEntries.push({
        objectId,
        objectKind: readAreaRuntimeUserDataString(userData, "objectKind"),
        rendererPath: "shared-placeables-renderer",
        sourceId,
        templateId,
        payloadStatus,
        geometryStatus,
        placeholderReason: reason,
        visualTransform,
        effectiveVisualTransform,
        visualTransformApplied:
          userData.auroraAreaObjectVisualTransformApplied === true,
        rootPosition: formatAreaRuntimeVector(root.position),
        rootRotation: formatAreaRuntimeVector(root.rotation),
        rootScale: formatAreaRuntimeVector(root.scale),
        renderTransform
      });
    }
    if (
      hasRenderableWorldBounds &&
      (reason === "none" || hasModelBoundsEvidence || snapshot.status === "ready")
    ) {
      const worldSize = new THREE.Vector3();
      worldBounds.getSize(worldSize);
      const worldMaxAxis = Math.max(
        Math.abs(worldSize.x),
        Math.abs(worldSize.y),
        Math.abs(worldSize.z)
      );
      const screenProjection = resolveAreaRuntimeScreenProjection(runtime, worldBounds);
      const effectivelyVisible = isAreaRuntimeObjectEffectivelyVisible(root);
      const materialEvidence = collectAreaSharedRendererMaterialEvidence(root);
      // Source-MDL emitter groups do not use the static-model texture loader's
      // root status marker. Their generated materials are nevertheless settled
      // once concrete texture maps are bound, so do not leave Area proof stuck
      // on `unknown` after both flame and smoke maps are present.
      if (
        (textureStatus === "loading" || textureStatus === "unknown") &&
        materialEvidence.mapReferences.length > 0
      ) {
        textureStatus = "applied";
      }
      textureStatusCounts[textureStatus] = (textureStatusCounts[textureStatus] ?? 0) + 1;
      modelBoundsEntries.push({
        objectId,
        sourceId,
        templateId,
        sourceAppearanceType: readAreaRuntimeUserDataOptionalNumber(
          userData,
          "auroraAreaObjectSourceAppearanceType"
        ),
        sourceGenericType: readAreaRuntimeUserDataOptionalNumber(
          userData,
          "auroraAreaObjectSourceGenericType"
        ),
        payloadAppearanceType: readAreaRuntimeUserDataOptionalNumber(
          userData,
          "auroraAreaObjectPayloadAppearanceType"
        ),
        payloadModelResRef: readAreaRuntimeUserDataString(
          userData,
          "auroraAreaObjectPayloadModelResRef"
        ),
        payloadModelGlbUrl: readAreaRuntimeUserDataString(
          userData,
          "auroraAreaObjectPayloadModelGlbUrl"
        ),
        payloadStatus: readAreaRuntimeUserDataString(
          userData,
          "auroraAreaObjectPayloadStatus"
        ),
        modelUrl,
        modelCacheKey,
        bounds: modelBounds,
        maxAxis: Number.isFinite(modelMaxAxis) ? Number(modelMaxAxis.toFixed(6)) : 0,
        worldBounds: formatAreaRuntimeBounds(worldBounds),
        worldSize: formatAreaRuntimeVector(worldSize),
        worldMaxAxis: roundAreaRuntimeNumber(worldMaxAxis),
        screenBounds: {
          minX: screenProjection.minX,
          minY: screenProjection.minY,
          maxX: screenProjection.maxX,
          maxY: screenProjection.maxY,
          width: screenProjection.width,
          height: screenProjection.height
        },
        screenCenter: screenProjection.center,
        screenVisible: screenProjection.visible && effectivelyVisible,
        sourcePlacement: {
          x: readAreaRuntimeUserDataNumber(userData, "auroraAreaObjectSourceX"),
          y: readAreaRuntimeUserDataNumber(userData, "auroraAreaObjectSourceY"),
          z: readAreaRuntimeUserDataNumber(userData, "auroraAreaObjectSourceZ"),
          bearing: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectSourceBearing"
          ),
          bearingDegrees: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectSourceBearingDegrees"
          )
        },
        renderAnchorVector: {
          x: readAreaRuntimeUserDataNumber(userData, "auroraAreaObjectRenderAnchorX"),
          y: readAreaRuntimeUserDataNumber(userData, "auroraAreaObjectRenderAnchorY"),
          z: readAreaRuntimeUserDataNumber(userData, "auroraAreaObjectRenderAnchorZ")
        },
        rootPosition: formatAreaRuntimeVector(root.position),
        rootRotation: formatAreaRuntimeVector(root.rotation),
        rootScale: formatAreaRuntimeVector(root.scale),
        layering: {
          mode: readAreaRuntimeUserDataString(userData, "auroraAreaObjectLayering"),
          reason: readAreaRuntimeUserDataString(
            userData,
            "auroraAreaObjectLayeringReason"
          ),
          footprint: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectLayeringFootprint"
          ),
          thickness: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectLayeringThickness"
          ),
          renderOrder: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectLayerRenderOrder"
          ),
          identity: readAreaRuntimeUserDataString(
            userData,
            "auroraAreaObjectLayeringIdentity"
          )
        },
        renderTransform,
        modelSurface: {
          offset: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceOffset"
          ),
          rawOffset: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceRawOffset"
          ),
          anchorY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceAnchorY"
          ),
          parentScaleY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceParentScaleY"
          ),
          targetMinY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceTargetMinY"
          ),
          beforeBounds: readAreaRuntimeUserDataString(
            userData,
            "auroraAreaObjectModelSurfaceBeforeBounds"
          ),
          beforeSize: {
            x: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceBeforeSizeX"
            ),
            y: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceBeforeSizeY"
            ),
            z: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceBeforeSizeZ"
            )
          },
          afterBounds: readAreaRuntimeUserDataString(
            userData,
            "auroraAreaObjectModelSurfaceAfterBounds"
          ),
          afterSize: {
            x: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceAfterSizeX"
            ),
            y: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceAfterSizeY"
            ),
            z: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceAfterSizeZ"
            )
          },
          beforeMinY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceBeforeMinY"
          ),
          beforeMaxY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceBeforeMaxY"
          ),
          afterMinY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceAfterMinY"
          ),
          afterMaxY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceAfterMaxY"
          ),
          liftTarget:
            typeof userData.auroraAreaObjectModelSurfaceLiftTarget === "string"
              ? userData.auroraAreaObjectModelSurfaceLiftTarget
              : "",
          terrainSurface: {
            status: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceStatus"
            ),
            surfaceY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceY"
            ),
            worldX: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceWorldX"
            ),
            worldZ: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceWorldZ"
            ),
            rayOriginY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceRayOriginY"
            ),
            rayFar: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceRayFar"
            ),
            hitCount: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceHitCount"
            ),
            candidateMeshCount: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceCandidateMeshCount"
            ),
            meshName: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceMeshName"
            ),
            tileId: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceTileId"
            ),
            modelResRef: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceModelResRef"
            )
          },
          terrainClip: {
            status: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectTerrainSurfaceClipStatus"
            ),
            applied: userData.auroraAreaObjectTerrainSurfaceClipApplied === true,
            reason: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectTerrainSurfaceClipReason"
            ),
            terrainSurfaceStatus: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectTerrainSurfaceClipTerrainSurfaceStatus"
            ),
            footprint: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectTerrainSurfaceClipFootprint"
            ),
            height: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectTerrainSurfaceClipHeight"
            ),
            maxFootprint: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectTerrainSurfaceClipMaxFootprint"
            ),
            minHeight: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectTerrainSurfaceClipMinHeight"
            ),
            source: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectTerrainSurfaceClipSource"
            )
          },
          supportSurface: createEmptyAreaSupportSurfaceEvidence("pending"),
          supportCorrection: {
            status: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectSupportCorrectionStatus"
            ),
            applied:
              userData.auroraAreaObjectSupportCorrectionApplied === true,
            offsetY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionOffsetY"
            ),
            objectBottomY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionObjectBottomY"
            ),
            objectTopY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionObjectTopY"
            ),
            afterBottomY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionAfterBottomY"
            ),
            afterTopY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionAfterTopY"
            ),
            supportObjectId: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectSupportCorrectionSupportObjectId"
            ),
            supportSourceId: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectSupportCorrectionSupportSourceId"
            ),
            supportTemplateId: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectSupportCorrectionSupportTemplateId"
            ),
            supportModelResRef: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectSupportCorrectionSupportModelResRef"
            ),
            supportTopY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionSupportTopY"
            ),
            supportBottomY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionSupportBottomY"
            ),
            gapY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionGapY"
            ),
            overlapX: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionOverlapX"
            ),
            overlapZ: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionOverlapZ"
            ),
            overlapArea: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionOverlapArea"
            ),
            overlapRatio: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionOverlapRatio"
            )
          },
          overlayReason: readAreaRuntimeUserDataString(
            userData,
            "auroraAreaObjectModelSurfaceOverlayReason"
          ),
          overlayFootprint: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceOverlayFootprint"
          ),
          overlayThickness: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceOverlayThickness"
          ),
          overlayRenderOrder: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceOverlayRenderOrder"
          ),
          clamped: userData.auroraAreaObjectModelSurfaceOffsetClamped === true
        },
        renderPosition:
          typeof userData.auroraAreaObjectPosition === "string"
            ? userData.auroraAreaObjectPosition
            : "",
        renderAnchor:
          typeof userData.auroraAreaObjectRenderAnchor === "string"
            ? userData.auroraAreaObjectRenderAnchor
            : "",
        bearing:
          typeof userData.auroraAreaObjectBearing === "string"
            ? userData.auroraAreaObjectBearing
            : "",
        visualTransform:
          typeof userData.auroraAreaObjectVisualTransform === "string"
            ? userData.auroraAreaObjectVisualTransform
            : "",
        visualTransformApplied: userData.auroraAreaObjectVisualTransformApplied === true,
        inactiveDamageStateMeshSuppressionStatus: readAreaRuntimeUserDataString(
          userData,
          "auroraAreaInactiveDamageStateMeshSuppressionStatus"
        ),
        inactiveDamageStateMeshSuppressedCount: readAreaRuntimeUserDataNumber(
          userData,
          "auroraAreaInactiveDamageStateMeshSuppressedCount"
        ),
        inactiveDamageStateMeshSuppressedNames: readAreaRuntimeUserDataString(
          userData,
          "auroraAreaInactiveDamageStateMeshSuppressedNames"
        ),
        meshCount: Number.isFinite(modelMeshCount) ? Math.max(0, Math.floor(modelMeshCount)) : 0,
        textureStatus,
        textureReferencedMaterialCount: readAreaRuntimeUserDataNumber(
          userData,
          "auroraAreaObjectSharedRendererTextureReferencedMaterialCount"
        ),
        textureMappedMaterialCount: readAreaRuntimeUserDataNumber(
          userData,
          "auroraAreaObjectSharedRendererTextureMappedMaterialCount"
        ),
        textureMissingMapMaterialCount: readAreaRuntimeUserDataNumber(
          userData,
          "auroraAreaObjectSharedRendererTextureMissingMapMaterialCount"
        ),
        textureAvailableReferences: splitLimitedAreaRuntimeIdList(
          typeof userData.auroraAreaObjectSharedRendererTextureAvailableReferences === "string"
            ? userData.auroraAreaObjectSharedRendererTextureAvailableReferences
            : ""
        ),
        textureRequestedReferences: splitLimitedAreaRuntimeIdList(
          typeof userData.auroraAreaObjectSharedRendererTextureRequestedReferences === "string"
            ? userData.auroraAreaObjectSharedRendererTextureRequestedReferences
            : ""
        ),
        textureLoadedReferences: splitLimitedAreaRuntimeIdList(
          typeof userData.auroraAreaObjectSharedRendererTextureLoadedReferences === "string"
            ? userData.auroraAreaObjectSharedRendererTextureLoadedReferences
            : ""
        ),
        textureFailedReferences: splitLimitedAreaRuntimeIdList(
          typeof userData.auroraAreaObjectSharedRendererTextureFailedReferences === "string"
            ? userData.auroraAreaObjectSharedRendererTextureFailedReferences
            : ""
        ),
        materialTextureReferences: materialEvidence.textureReferences,
        materialMapReferences: materialEvidence.mapReferences,
        materialFlags: materialEvidence.flags,
        materialOpacityRange: materialEvidence.opacityRange,
        materialSamples: materialEvidence.materialSamples,
        diagnosticPriority: materialEvidence.diagnosticPriority
      });
      if (textureStatus === "loading") {
        texturePendingIds.push(objectId);
      } else if (textureStatus === "missing") {
        textureMissingIds.push(objectId);
      } else if (textureStatus === "fallback") {
        textureFallbackIds.push(objectId);
      } else if (textureStatus === "skipped") {
        textureSkippedIds.push(objectId);
      } else if (textureStatus === "partial") {
        texturePartialIds.push(objectId);
      }
    }
    if (reason === "model-load-failed") {
      if (modelUrl) {
        modelLoadFailedModelUrls.add(modelUrl);
      }
      if (modelCacheKey) {
        modelLoadFailedModelCacheKeys.add(modelCacheKey);
      }
    }
  });
  (snapshot.placeholderReasonIds["not-applicable"] ?? []).forEach((objectId) => {
    if (!refreshedObjectIds.has(objectId)) {
      placeholderReasonIds["not-applicable"].push(objectId);
    }
  });

  const placeholderReasonCounts = Object.fromEntries(
    AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
      reason,
      placeholderReasonIds[reason].length
    ])
  ) as Record<AreaPlaceablePlaceholderReason, number>;
  const missingPayloadIds = placeholderReasonIds["missing-payload"];
  const payloadMissingModelUrlIds = placeholderReasonIds["payload-missing-model-url"];
  const assetContractBlockedIds = placeholderReasonIds["asset-contract-blocked"];
  const modelLoadFailedIds = placeholderReasonIds["model-load-failed"];
  const stillLoadingIds = placeholderReasonIds["still-loading"];
  const primitiveFallbackIds = AREA_PLACEABLE_PLACEHOLDER_REASONS.flatMap((reason) =>
    reason === "none" || reason === "not-applicable" ? [] : placeholderReasonIds[reason]
  );
  const textureIssueIds = [
    ...texturePartialIds,
    ...textureMissingIds,
    ...textureFallbackIds,
    ...textureSkippedIds
  ];
  const blockedIds = [
    ...primitiveFallbackIds,
    ...texturePendingIds,
    ...textureIssueIds
  ];
  const modelReadyCount = placeholderReasonIds.none.length;
  const notApplicableCount = placeholderReasonIds["not-applicable"].length;
  const readyOrNotRenderableCount = modelReadyCount + notApplicableCount;
  const total = Math.max(0, snapshot.total);
  const payloadBoundCount = Math.max(0, snapshot.payloadBoundCount);
  const primitiveFallbackCount = primitiveFallbackIds.length;
  const status =
    total === 0
      ? "none"
      : primitiveFallbackCount === 0 &&
          texturePendingIds.length === 0 &&
          textureIssueIds.length === 0 &&
          payloadBoundCount >= total &&
          readyOrNotRenderableCount >= total
        ? "ready"
        : payloadBoundCount > 0 || readyOrNotRenderableCount > 0
          ? "partial"
          : "blocked";
  const placeholderStatus =
    total === 0
      ? "none"
      : primitiveFallbackCount === 0
        ? "ready"
        : primitiveFallbackCount < total
          ? "partial"
          : "blocked";
  refreshAreaSharedRendererSupportSurfaceEvidence(modelBoundsEntries);
  const modelBoundsSample = modelBoundsEntries
    .sort(
      (left, right) =>
        right.worldMaxAxis - left.worldMaxAxis ||
        right.maxAxis - left.maxAxis ||
        right.diagnosticPriority - left.diagnosticPriority
    )
    .slice(0, AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT);
  const areaRenderFrameMirror = resolveAreaRenderFrameMirrorSnapshot(runtime);
  const refreshedSnapshot: AreaSharedRendererRuntimeSnapshot = {
    ...snapshot,
    status,
    placeholderStatus,
    modelReadyCount,
    primitiveFallbackCount,
    primitiveFallbackSuppressedCount: Math.max(
      0,
      primitiveFallbackCount - snapshot.primitiveFallbackRenderLimit
    ),
    placeholderReasonCounts,
    placeholderReasonIds: Object.fromEntries(
      AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
        reason,
        limitAreaRuntimeIdList(placeholderReasonIds[reason])
      ])
    ) as Record<AreaPlaceablePlaceholderReason, string[]>,
    missingPayloadIds: limitAreaRuntimeIdList(missingPayloadIds),
    payloadMissingModelUrlIds: limitAreaRuntimeIdList(payloadMissingModelUrlIds),
    assetContractBlockedIds: limitAreaRuntimeIdList(assetContractBlockedIds),
    modelLoadFailedIds: limitAreaRuntimeIdList(modelLoadFailedIds),
    modelLoadFailedModelUrls: limitAreaRuntimeIdList(
      Array.from(modelLoadFailedModelUrls)
    ),
    modelLoadFailedModelCacheKeys: limitAreaRuntimeIdList(
      Array.from(modelLoadFailedModelCacheKeys)
    ),
    stillLoadingIds: limitAreaRuntimeIdList(stillLoadingIds),
    primitiveFallbackIds: limitAreaRuntimeIdList(primitiveFallbackIds),
    textureStatusCounts,
    texturePendingIds: limitAreaRuntimeIdList(texturePendingIds),
    textureIssueIds: limitAreaRuntimeIdList(textureIssueIds),
    textureMissingIds: limitAreaRuntimeIdList(textureMissingIds),
    textureFallbackIds: limitAreaRuntimeIdList(textureFallbackIds),
    textureSkippedIds: limitAreaRuntimeIdList(textureSkippedIds),
    toolsetPhysicalHiddenIds: limitAreaRuntimeIdList(toolsetPhysicalHiddenIds),
    toolsetPhysicalHiddenReasons: limitAreaRuntimeIdList(toolsetPhysicalHiddenReasons),
    blockedIds: limitAreaRuntimeIdList(blockedIds),
    areaRenderFrameMirror,
    objectVisualTransformRootCount,
    objectVisualTransformAppliedCount,
    objectVisualTransformAppliedIds: limitAreaRuntimeIdList(objectVisualTransformAppliedIds),
    objectVisualTransformSample: objectVisualTransformSampleEntries,
    visualTransformSample: visualTransformSampleEntries,
    modelBoundsSample
  };

  runtime.container.dataset.areaObjectSharedRendererModelReadyCount =
    String(modelReadyCount);
  runtime.container.dataset.areaObjectSharedRendererPrimitiveFallbackCount =
    String(primitiveFallbackCount);
  runtime.container.dataset.areaObjectSharedRendererPrimitiveFallbackSuppressedCount =
    String(refreshedSnapshot.primitiveFallbackSuppressedCount);
  runtime.container.dataset.areaObjectSharedRendererMissingPayloadIds =
    joinLimitedAreaRuntimeIds(missingPayloadIds);
  runtime.container.dataset.areaObjectSharedRendererPayloadMissingModelUrlIds =
    joinLimitedAreaRuntimeIds(payloadMissingModelUrlIds);
  runtime.container.dataset.areaObjectSharedRendererAssetContractBlockedIds =
    joinLimitedAreaRuntimeIds(assetContractBlockedIds);
  runtime.container.dataset.areaObjectSharedRendererModelLoadFailedIds =
    joinLimitedAreaRuntimeIds(modelLoadFailedIds);
  runtime.container.dataset.areaObjectSharedRendererModelLoadFailedModelUrls =
    joinLimitedAreaRuntimeIds(Array.from(modelLoadFailedModelUrls));
  runtime.container.dataset.areaObjectSharedRendererModelLoadFailedModelCacheKeys =
    joinLimitedAreaRuntimeIds(Array.from(modelLoadFailedModelCacheKeys));
  runtime.container.dataset.areaObjectSharedRendererStillLoadingIds =
    joinLimitedAreaRuntimeIds(stillLoadingIds);
  runtime.container.dataset.areaObjectSharedRendererTextureStatusCounts =
    JSON.stringify(textureStatusCounts);
  runtime.container.dataset.areaObjectSharedRendererTexturePendingIds =
    joinLimitedAreaRuntimeIds(texturePendingIds);
  runtime.container.dataset.areaObjectSharedRendererTextureIssueIds =
    joinLimitedAreaRuntimeIds(textureIssueIds);
  runtime.container.dataset.areaObjectSharedRendererTextureMissingIds =
    joinLimitedAreaRuntimeIds(textureMissingIds);
  runtime.container.dataset.areaObjectSharedRendererTextureFallbackIds =
    joinLimitedAreaRuntimeIds(textureFallbackIds);
  runtime.container.dataset.areaObjectSharedRendererTextureSkippedIds =
    joinLimitedAreaRuntimeIds(textureSkippedIds);
  runtime.container.dataset.areaObjectToolsetPhysicalHiddenIds =
    joinLimitedAreaRuntimeIds(toolsetPhysicalHiddenIds);
  runtime.container.dataset.areaObjectToolsetPhysicalHiddenReasons =
    joinLimitedAreaRuntimeIds(toolsetPhysicalHiddenReasons);
  runtime.container.dataset.areaObjectSharedRendererAreaRenderFrameMirror =
    JSON.stringify(areaRenderFrameMirror);
  runtime.container.dataset.areaObjectSharedRendererModelBoundsSample =
    JSON.stringify(modelBoundsSample);
  runtime.container.dataset.areaObjectSharedRendererVisualTransformSample =
    JSON.stringify(visualTransformSampleEntries);
  runtime.container.dataset.areaObjectSharedRendererVisualTransformSampleCount =
    String(visualTransformSampleEntries.length);
  runtime.container.dataset.areaObjectVisualTransformSample =
    JSON.stringify(objectVisualTransformSampleEntries);
  runtime.container.dataset.areaObjectVisualTransformSampleCount =
    String(objectVisualTransformSampleEntries.length);
  runtime.container.dataset.areaObjectVisualTransformRootCount =
    String(objectVisualTransformRootCount);
  runtime.container.dataset.areaObjectVisualTransformAppliedCount =
    String(objectVisualTransformAppliedCount);
  runtime.container.dataset.areaObjectVisualTransformAppliedIds =
    joinLimitedAreaRuntimeIds(objectVisualTransformAppliedIds);
  runtime.container.dataset.areaObjectSharedRendererRuntimeRootCount =
    String(sharedRendererRootCount);
  runtime.container.dataset.areaObjectSharedRendererRuntimeRootWithChildrenCount =
    String(sharedRendererRootWithChildrenCount);
  runtime.container.dataset.areaObjectSharedRendererRuntimeRootChildCount =
    String(sharedRendererRootChildCount);
  runtime.container.dataset.areaObjectSharedRendererRuntimeRootMeshDescendantCount =
    String(sharedRendererRootMeshDescendantCount);
  runtime.container.dataset.areaObjectSharedRendererRuntimeRootSample =
    sharedRendererRootSample.join("|");
  runtime.container.dataset.areaObjectSharedRendererRuntimeRootEvaluationSample =
    sharedRendererRootEvaluationSample.join("|");
  runtime.container.dataset.areaObjectSharedRendererModelBoundsEntryCount =
    String(modelBoundsEntries.length);
  runtime.container.dataset.areaObjectSharedRendererModelBoundsSampleCount =
    String(modelBoundsSample.length);
  runtime.container.dataset.areaObjectSharedRendererBoundsCandidateCount =
    String(sharedRendererBoundsCandidateCount);
  runtime.container.dataset.areaObjectBackendRenderBlockedCount =
    String(blockedIds.length);
  runtime.container.dataset.areaObjectBackendRenderBlockedIds =
    joinLimitedAreaRuntimeIds(blockedIds);
  runtime.container.dataset.areaObjectPrimitiveFallbackIds =
    joinLimitedAreaRuntimeIds(primitiveFallbackIds);
  runtime.container.dataset.areaObjectSharedRendererStatus = status;
  runtime.container.dataset.areaObjectSharedRendererPlaceholderStatus = placeholderStatus;
  runtime.container.dataset.areaObjectBackendRenderContractStatus = status;
  runtime.container.dataset.areaObjectSharedRendererPlaceholderReasonCounts =
    JSON.stringify(placeholderReasonCounts);
  runtime.container.dataset.areaObjectSharedRendererPlaceholderReasonIds =
    JSON.stringify(
      Object.fromEntries(
        AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
          reason,
          joinLimitedAreaRuntimeIds(placeholderReasonIds[reason])
        ])
      )
    );
  runtime.container.dataset.areaObjectSharedRendererSnapshot = JSON.stringify(
    refreshedSnapshot
  );
  runtime.container.dispatchEvent(
    new CustomEvent<AreaSharedRendererRuntimeSnapshot>(AREA_SHARED_RENDERER_SNAPSHOT_EVENT, {
      detail: refreshedSnapshot
    })
  );
}

function scheduleAreaSharedRendererRuntimeSnapshotEvidenceRefresh(
  runtime: RuntimeState
): void {
  const refreshIfMounted = () => {
    if (!runtime.container.isConnected) {
      return;
    }
    safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
  };
  if (typeof window === "undefined") {
    refreshIfMounted();
    return;
  }
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => {
      refreshIfMounted();
      window.setTimeout(refreshIfMounted, 250);
    });
    return;
  }
  window.setTimeout(refreshIfMounted, 0);
}

function safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(
  runtime: RuntimeState
): void {
  try {
    delete runtime.container.dataset.areaObjectSharedRendererRefreshError;
    refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
  } catch (error) {
    runtime.container.dataset.areaObjectSharedRendererRefreshError =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
}

export function refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidenceForTests(
  runtime: RuntimeState
): void {
  refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
}

function writeAreaTileOverlayRuntimeDiagnostics(
  runtime: RuntimeState,
  options: { optionEnabled: boolean; renderLayerVisible: boolean }
): void {
  const dataset = runtime.container.dataset;
  const overlayChild = runtime.tileOverlayLayer.children[0] ?? null;
  const overlayLines = overlayChild instanceof THREE.LineSegments ? overlayChild : null;
  const overlayMaterial = Array.isArray(overlayLines?.material)
    ? overlayLines?.material[0]
    : overlayLines?.material;
  const lineMaterial =
    overlayMaterial instanceof THREE.LineBasicMaterial ? overlayMaterial : null;
  const positionAttribute = overlayLines?.geometry.getAttribute("position");
  const vertexCount = positionAttribute?.count ?? 0;

  dataset.areaTileOverlayOptionEnabled = String(options.optionEnabled);
  dataset.areaTileOverlayRenderLayerVisible = String(options.renderLayerVisible);
  dataset.areaTileOverlayGroupVisible = String(runtime.tileOverlayLayer.visible);
  dataset.areaTileOverlayChildCount = String(runtime.tileOverlayLayer.children.length);
  dataset.areaTileOverlayLineCount = String(Math.floor(vertexCount / 2));
  dataset.areaTileOverlayVertexCount = String(vertexCount);
  dataset.areaTileOverlayRenderOrder = String(overlayLines?.renderOrder ?? "none");
  dataset.areaTileOverlayDepthTest = String(lineMaterial?.depthTest ?? "none");
  dataset.areaTileOverlayDepthWrite = String(lineMaterial?.depthWrite ?? "none");
  dataset.areaTileOverlayOpacity = String(lineMaterial?.opacity ?? "none");
  dataset.areaTileOverlayColor = lineMaterial
    ? `#${lineMaterial.color.getHexString()}`
    : "none";
  dataset.areaTileOverlayPosition = overlayLines
    ? `${overlayLines.position.x.toFixed(3)},${overlayLines.position.y.toFixed(3)},${overlayLines.position.z.toFixed(3)}`
    : "none";
}

function setAreaOracleTileLightMarkersVisible(
  runtime: RuntimeState,
  visible: boolean
): number {
  let markerCount = 0;
  runtime.scene.traverse((node) => {
    if (node.userData?.auroraTerrainTileLightMarker === true) {
      node.visible = visible;
      markerCount += 1;
    }
  });
  runtime.container.dataset.areaOracleTileLightMarkersVisible = String(visible);
  runtime.container.dataset.areaOracleTileLightMarkerCount = String(markerCount);
  return markerCount;
}

function setAreaOracleTileLightsVisible(
  runtime: RuntimeState,
  visible: boolean
): { found: boolean; childCount: number } {
  const lightLayer = runtime.scene.getObjectByName("terrain-tile-light-sources");
  if (!lightLayer) {
    runtime.container.dataset.areaOracleTileLightsVisible = String(visible);
    runtime.container.dataset.areaOracleTileLightLayerFound = "false";
    runtime.container.dataset.areaOracleTileLightLayerChildCount = "0";
    return { found: false, childCount: 0 };
  }
  lightLayer.visible = visible;
  runtime.container.dataset.areaOracleTileLightsVisible = String(visible);
  runtime.container.dataset.areaOracleTileLightLayerFound = "true";
  runtime.container.dataset.areaOracleTileLightLayerChildCount = String(
    lightLayer.children.length
  );
  return { found: true, childCount: lightLayer.children.length };
}

function normalizeAreaOracleTerrainVoidMaskFilterToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function readAreaOracleTerrainVoidMaskSourceMesh(node: THREE.Object3D): string | null {
  let current: THREE.Object3D | null = node;
  while (current) {
    const userData = current.userData as Record<string, unknown> | undefined;
    const aurora =
      userData?.aurora && typeof userData.aurora === "object" && !Array.isArray(userData.aurora)
        ? (userData.aurora as Record<string, unknown>)
        : userData;
    const sourceMesh = normalizeAreaOracleTerrainVoidMaskFilterToken(aurora?.sourceMesh);
    if (sourceMesh) {
      return sourceMesh;
    }
    current = current.parent;
  }
  return normalizeAreaOracleTerrainVoidMaskFilterToken(node.name);
}

function readAreaOracleTerrainVoidMaskModelResRef(node: THREE.Object3D): string | null {
  let current: THREE.Object3D | null = node;
  while (current) {
    const modelResRef = normalizeAreaOracleTerrainVoidMaskFilterToken(
      current.userData?.auroraTerrainTileModelResRef
    );
    if (modelResRef) {
      return modelResRef;
    }
    current = current.parent;
  }
  return null;
}

function setAreaOracleTerrainVoidMasksVisible(
  runtime: RuntimeState,
  visible: boolean,
  filter: { modelResRef?: string | null; sourceMesh?: string | null } = {}
): number {
  const modelResRefFilter = normalizeAreaOracleTerrainVoidMaskFilterToken(
    filter.modelResRef
  );
  const sourceMeshFilter = normalizeAreaOracleTerrainVoidMaskFilterToken(
    filter.sourceMesh
  );
  let maskCount = 0;
  let matchedCount = 0;
  runtime.scene.traverse((node) => {
    if (node.userData?.auroraTerrainVoidMask !== true) {
      return;
    }
    maskCount += 1;
    const modelResRef = readAreaOracleTerrainVoidMaskModelResRef(node);
    const sourceMesh = readAreaOracleTerrainVoidMaskSourceMesh(node);
    const matchesModel =
      !modelResRefFilter || modelResRef === modelResRefFilter;
    const matchesSource = !sourceMeshFilter || sourceMesh === sourceMeshFilter;
    if (!matchesModel || !matchesSource) {
      return;
    }
    node.visible = visible;
    node.userData = {
      ...node.userData,
      auroraTerrainVoidMaskCaptureVisibility: visible ? "visible" : "hidden"
    };
    matchedCount += 1;
  });
  runtime.container.dataset.areaOracleTerrainVoidMasksVisible = String(visible);
  runtime.container.dataset.areaOracleTerrainVoidMaskCount = String(maskCount);
  runtime.container.dataset.areaOracleTerrainVoidMaskMatchedCount = String(matchedCount);
  runtime.container.dataset.areaOracleTerrainVoidMaskFilterModelResRef =
    modelResRefFilter ?? "";
  runtime.container.dataset.areaOracleTerrainVoidMaskFilterSourceMesh =
    sourceMeshFilter ?? "";
  return matchedCount;
}

function setAreaOracleTerrainMaterialMode(
  runtime: RuntimeState,
  mode: string | null | undefined
): number {
  const normalized = typeof mode === "string" ? mode.trim().toLowerCase() : "";
  if (normalized !== "basic" && normalized !== "unlit") {
    return 0;
  }
  const layer = runtime.scene.getObjectByName("terrain-backend-tile-models");
  if (!layer) {
    runtime.container.dataset.areaOracleTerrainMaterialMode = normalized;
    runtime.container.dataset.areaOracleTerrainMaterialConvertedCount = "0";
    runtime.container.dataset.areaOracleTerrainMaterialLayerFound = "false";
    return 0;
  }
  let convertedCount = 0;
  const convertMaterial = (material: THREE.Material): THREE.Material => {
    const source = material as THREE.Material & {
      alphaTest?: number;
      color?: THREE.Color;
      map?: THREE.Texture | null;
    };
    const converted = new THREE.MeshBasicMaterial({
      alphaTest: source.alphaTest ?? 0,
      blending: material.blending,
      color: source.color instanceof THREE.Color ? source.color.clone() : 0xffffff,
      depthTest: material.depthTest,
      depthWrite: material.depthWrite,
      map: source.map ?? null,
      opacity: material.opacity,
      side: material.side,
      transparent: material.transparent
    });
    converted.name = material.name;
    converted.userData = {
      ...material.userData,
      auroraTerrainOracleMaterialMode: normalized,
      auroraTerrainOracleSourceMaterialType: material.type
    };
    convertedCount += 1;
    return converted;
  };
  layer.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    node.material = Array.isArray(node.material)
      ? node.material.map((material) => convertMaterial(material))
      : convertMaterial(node.material);
  });
  runtime.container.dataset.areaOracleTerrainMaterialMode = normalized;
  runtime.container.dataset.areaOracleTerrainMaterialConvertedCount =
    String(convertedCount);
  runtime.container.dataset.areaOracleTerrainMaterialLayerFound = "true";
  return convertedCount;
}

function setAreaOracleGlobalFogVisible(runtime: RuntimeState, visible: boolean): void {
  if (!visible) {
    runtime.scene.fog = null;
    runtime.scene.userData.auroraTerrainAreaGlobalFogStatus = "available_disabled_by_capture";
    runtime.container.dataset.areaTerrainAreaGlobalFogStatus =
      "available_disabled_by_capture";
    runtime.container.dataset.areaOracleDisplayFog = "false";
    return;
  }
  runtime.container.dataset.areaOracleDisplayFog = "true";
}

function setAreaOracleAreaLightingVisible(runtime: RuntimeState, visible: boolean): void {
  const lightingLayer = runtime.scene.getObjectByName("terrain-area-global-lighting");
  if (lightingLayer) {
    lightingLayer.visible = visible;
  }
  if (!visible) {
    runtime.scene.userData.auroraTerrainAreaGlobalLightingStatus =
      "available_disabled_by_capture";
    runtime.container.dataset.areaTerrainAreaGlobalLightingStatus =
      "available_disabled_by_capture";
  }
  runtime.container.dataset.areaOracleUseAreaLighting = String(visible);
  runtime.container.dataset.areaOracleAreaLightingLayerFound = lightingLayer ? "true" : "false";
  runtime.container.dataset.areaOracleAreaLightingLayerChildCount = String(
    lightingLayer?.children.length ?? 0
  );
}

function writeAreaTileProcessRuntimeDiagnostics(
  runtime: RuntimeState,
  readiness: AreaTileProcessContractReadiness | null
): void {
  const dataset = runtime.container.dataset;
  const snapshot: AreaTileProcessRuntimeSnapshot = readiness
    ? {
        version: "aurora-areas-tile-process-runtime/v1",
        path: "backend-tile-process-contract",
        status: readiness.status,
        areaId: readiness.areaId,
        expectedCandidateCount:
          readiness.expectedCandidateCount ?? readiness.checkedCandidateCount,
        pendingCandidateCount:
          readiness.pendingCandidateCount ??
          Math.max(
            (readiness.expectedCandidateCount ?? readiness.checkedCandidateCount) -
              readiness.checkedCandidateCount,
            0
          ),
        checkedCandidateCount: readiness.checkedCandidateCount,
        readyCandidateCount: readiness.readyCandidateCount,
        blockedCandidateCount: readiness.blockedCandidateCount,
        sourceAssetReadyCount: readiness.sourceAssetReadyCount,
        mdlSourceReadyCount: readiness.mdlSourceReadyCount,
        glbGeometryReadyCount: readiness.glbGeometryReadyCount,
        materialTextureContractReadyCount: readiness.materialTextureContractReadyCount,
        materialBindingBlockedCount: readiness.materialBindingBlockedCount,
        renderLoaderReadyCount: readiness.renderLoaderReadyCount,
        blockerSummary: readiness.blockerSummary,
        sourceObjectKeySample: readiness.sourceObjectKeySample,
        sourceAssetContractSample: readiness.sourceAssetContractSample,
        textureMaterialBlockerSummary: readiness.textureMaterialBlockerSummary,
        renderAssetContractBlockerSummary: readiness.renderAssetContractBlockerSummary,
        mdlGlbMaterialBlockerSummary: readiness.mdlGlbMaterialBlockerSummary
      }
    : {
        version: "aurora-areas-tile-process-runtime/v1",
        path: "backend-tile-process-contract",
        status: "not_checked",
        areaId: null,
        expectedCandidateCount: 0,
        pendingCandidateCount: 0,
        checkedCandidateCount: 0,
        readyCandidateCount: 0,
        blockedCandidateCount: 0,
        sourceAssetReadyCount: 0,
        mdlSourceReadyCount: 0,
        glbGeometryReadyCount: 0,
        materialTextureContractReadyCount: 0,
        materialBindingBlockedCount: 0,
        renderLoaderReadyCount: 0,
        blockerSummary: "not_checked",
        sourceObjectKeySample: "none",
        sourceAssetContractSample: "none",
        textureMaterialBlockerSummary: "not_checked",
        renderAssetContractBlockerSummary: "not_checked",
        mdlGlbMaterialBlockerSummary: "not_checked"
      };

  if (!readiness) {
    dataset.areaTileProcessRuntimeStatus = "not_checked";
    dataset.areaTileProcessRuntimeAreaId = "none";
    dataset.areaTileProcessRuntimeExpectedCount = "0";
    dataset.areaTileProcessRuntimePendingCount = "0";
    dataset.areaTileProcessRuntimeCheckedCount = "0";
    dataset.areaTileProcessRuntimeReadyCount = "0";
    dataset.areaTileProcessRuntimeBlockedCount = "0";
    dataset.areaTileProcessRuntimeSourceAssetReadyCount = "0";
    dataset.areaTileProcessRuntimeMdlSourceReadyCount = "0";
    dataset.areaTileProcessRuntimeGlbGeometryReadyCount = "0";
    dataset.areaTileProcessRuntimeMaterialTextureReadyCount = "0";
    dataset.areaTileProcessRuntimeMaterialBindingBlockedCount = "0";
    dataset.areaTileProcessRuntimeRenderLoaderReadyCount = "0";
    dataset.areaTileProcessRuntimeBlockers = "not_checked";
    dataset.areaTileProcessRuntimeSourceObjectSample = "none";
    dataset.areaTileProcessRuntimeSourceAssetContractSample = "none";
    dataset.areaTileProcessRuntimeTextureMaterialBlockers = "not_checked";
    dataset.areaTileProcessRuntimeRenderAssetContractBlockers = "not_checked";
    dataset.areaTileProcessRuntimeMdlGlbMaterialBlockers = "not_checked";
    dataset.areaTileProcessRuntimeSnapshot = serializeAreaEditingProofValue(snapshot);
    runtime.container.dispatchEvent(
      new CustomEvent<AreaTileProcessRuntimeSnapshot>(
        AREA_TILE_PROCESS_RUNTIME_SNAPSHOT_EVENT,
        { detail: snapshot }
      )
    );
    return;
  }

  dataset.areaTileProcessRuntimeStatus = readiness.status;
  dataset.areaTileProcessRuntimeAreaId = readiness.areaId;
  dataset.areaTileProcessRuntimeExpectedCount = String(
    readiness.expectedCandidateCount ?? readiness.checkedCandidateCount
  );
  dataset.areaTileProcessRuntimePendingCount = String(
    readiness.pendingCandidateCount ??
      Math.max(
        (readiness.expectedCandidateCount ?? readiness.checkedCandidateCount) -
          readiness.checkedCandidateCount,
        0
      )
  );
  dataset.areaTileProcessRuntimeCheckedCount = String(readiness.checkedCandidateCount);
  dataset.areaTileProcessRuntimeReadyCount = String(readiness.readyCandidateCount);
  dataset.areaTileProcessRuntimeBlockedCount = String(readiness.blockedCandidateCount);
  dataset.areaTileProcessRuntimeSourceAssetReadyCount = String(
    readiness.sourceAssetReadyCount
  );
  dataset.areaTileProcessRuntimeMdlSourceReadyCount = String(readiness.mdlSourceReadyCount);
  dataset.areaTileProcessRuntimeGlbGeometryReadyCount = String(
    readiness.glbGeometryReadyCount
  );
  dataset.areaTileProcessRuntimeMaterialTextureReadyCount = String(
    readiness.materialTextureContractReadyCount
  );
  dataset.areaTileProcessRuntimeMaterialBindingBlockedCount = String(
    readiness.materialBindingBlockedCount
  );
  dataset.areaTileProcessRuntimeRenderLoaderReadyCount = String(
    readiness.renderLoaderReadyCount
  );
  dataset.areaTileProcessRuntimeBlockers = readiness.blockerSummary;
  dataset.areaTileProcessRuntimeSourceObjectSample = readiness.sourceObjectKeySample;
  dataset.areaTileProcessRuntimeSourceAssetContractSample =
    readiness.sourceAssetContractSample;
  dataset.areaTileProcessRuntimeTextureMaterialBlockers =
    readiness.textureMaterialBlockerSummary;
  dataset.areaTileProcessRuntimeRenderAssetContractBlockers =
    readiness.renderAssetContractBlockerSummary;
  dataset.areaTileProcessRuntimeMdlGlbMaterialBlockers =
    readiness.mdlGlbMaterialBlockerSummary;
  dataset.areaTileProcessRuntimeSnapshot = serializeAreaEditingProofValue(snapshot);
  runtime.container.dispatchEvent(
    new CustomEvent<AreaTileProcessRuntimeSnapshot>(
      AREA_TILE_PROCESS_RUNTIME_SNAPSHOT_EVENT,
      { detail: snapshot }
    )
  );
}

function formatAreaTileProcessRuntimeStatus(
  readiness: AreaTileProcessContractReadiness | null | undefined
): string {
  if (!readiness) {
    return "not checked";
  }
  const expectedCandidateCount =
    readiness.expectedCandidateCount ?? readiness.checkedCandidateCount;
  return [
    readiness.status,
    `checked ${readiness.checkedCandidateCount}/${expectedCandidateCount}`,
    `ready ${readiness.readyCandidateCount}/${expectedCandidateCount}`,
    `source ${readiness.sourceAssetReadyCount}/${expectedCandidateCount}`,
    `mdl ${readiness.mdlSourceReadyCount}/${expectedCandidateCount}`,
    `glb ${readiness.glbGeometryReadyCount}/${expectedCandidateCount}`,
    `loader ${readiness.renderLoaderReadyCount}/${expectedCandidateCount}`
  ].join(" / ");
}

function formatAreaTileModelLoaderRuntimeStatus(
  readiness: AreaTileProcessContractReadiness | null | undefined
): string {
  if (!readiness) {
    return "not checked";
  }

  const readyModelCount = readiness.entries.filter(
    (entry) => entry.modelDeliveryStatus === "ready" && Boolean(entry.modelDeliveryUrl)
  ).length;
  const blockedModelCount = readiness.entries.filter(
    (entry) => entry.modelDeliveryStatus === "blocked_tile_model_glb_missing"
  ).length;
  const sample =
    readiness.entries.find((entry) => entry.modelAssetObjectKey)?.modelAssetObjectKey ??
    readiness.entries.find((entry) => entry.expectedDerivedModelObjectKey)
      ?.expectedDerivedModelObjectKey ??
    "none";
  const expectedCandidateCount =
    readiness.expectedCandidateCount ?? readiness.checkedCandidateCount;

  return [
    `checked ${readiness.checkedCandidateCount}/${expectedCandidateCount}`,
    `ready ${readyModelCount}/${expectedCandidateCount}`,
    `blocked ${blockedModelCount}/${expectedCandidateCount}`,
    `sample ${sample}`
  ].join(" / ");
}

function writeAreaObjectSourceDiagnostics(
  runtime: RuntimeState,
  visibleObjects: SceneObject[],
  selectedObjectIds: string[],
  placeableRenderPayloadsByObjectId: Record<string, PlaceableViewportRenderPayload> | null,
  creatureRenderPayloadsByObjectId: Record<string, CreatureViewportRenderPayload> | null
): void {
  const counts: Record<SceneObjectKind, number> = {
    placeables: 0,
    creatures: 0,
    doors: 0,
    encounters: 0,
    items: 0,
    sounds: 0,
    stores: 0,
    triggers: 0,
    waypoints: 0
  };
  let auroraGitCount = 0;
  visibleObjects.forEach((object) => {
    counts[object.kind] += 1;
    if (object.source?.type === "aurora_git") {
      auroraGitCount += 1;
    }
  });
  const fallbackCount = Math.max(0, visibleObjects.length - auroraGitCount);
  const visibleObjectIndexById = new Map(
    visibleObjects.map((object, index) => [object.id, index])
  );
  const selectedVisibleObjects = selectedObjectIds
    .map((id) => visibleObjects[visibleObjectIndexById.get(id) ?? -1])
    .filter((object): object is SceneObject => Boolean(object));
  const selectedAuroraGitCount = selectedVisibleObjects.filter(
    (object) => object.source?.type === "aurora_git"
  ).length;
  const selectedFallbackCount = Math.max(0, selectedVisibleObjects.length - selectedAuroraGitCount);
  const sharedRendererRuntimeEvidenceByObjectId =
    collectAreaObjectSharedRendererRuntimeEvidenceByObjectId(runtime, visibleObjects);
  const backendRenderContractDiagnostics = resolveAreaObjectBackendRenderContractDiagnostics(
    visibleObjects,
    placeableRenderPayloadsByObjectId,
    new Set(),
    sharedRendererRuntimeEvidenceByObjectId
  );
  const visibleEvidenceLimit = resolveAreaObjectRuntimeEvidenceDatasetLimit(visibleObjects.length);
  const visibleEvidenceObjects = visibleObjects.slice(0, visibleEvidenceLimit.rowCount);
  const visibleCreatureObjects = visibleObjects.filter((object) => object.kind === "creatures");
  const creatureRenderPayloadReadyCount = visibleCreatureObjects.filter((object) =>
    Boolean(creatureRenderPayloadsByObjectId?.[object.id])
  ).length;
  const creatureRenderPackageReadyCount = visibleCreatureObjects.filter((object) =>
    Boolean(creatureRenderPayloadsByObjectId?.[object.id]?.renderPackage)
  ).length;
  const creatureRenderModelUrlReadyCount = visibleCreatureObjects.filter((object) => {
    const renderPackage = creatureRenderPayloadsByObjectId?.[object.id]?.renderPackage;
    return (
      renderPackage?.status === "ready" &&
      (Boolean(renderPackage.glbUrl?.trim()) || Boolean(renderPackage.modelUrl?.trim()))
    );
  }).length;
  const creatureRenderModelReadyCount = visibleCreatureObjects.filter((object) => {
    const userData = runtime.objectMeshById.get(object.id)?.userData;
    if (userData?.creatureRenderModelReady === true) {
      return true;
    }
    const partModelGroupStatus = userData?.creaturePartModelGroupStatus;
    return partModelGroupStatus === "loaded" || partModelGroupStatus === "partial";
  }).length;

  runtime.container.dataset.areaObjectSource = auroraGitCount > 0 ? "aurora_git" : "local_or_empty";
  runtime.container.dataset.areaObjectSourceStatus =
    visibleObjects.length === 0
      ? "empty"
      : fallbackCount === 0
        ? "source-backed"
        : auroraGitCount > 0
          ? "mixed-source-fallback"
          : "fallback";
  runtime.container.dataset.areaObjectVisibleCount = String(visibleObjects.length);
  runtime.container.dataset.areaObjectAuroraGitCount = String(auroraGitCount);
  runtime.container.dataset.areaObjectFallbackCount = String(fallbackCount);
  runtime.container.dataset.areaObjectPlaceableCount = String(counts.placeables);
  runtime.container.dataset.areaObjectDoorCount = String(counts.doors);
  runtime.container.dataset.areaObjectCreatureCount = String(counts.creatures);
  runtime.container.dataset.areaObjectItemCount = String(counts.items);
  runtime.container.dataset.areaObjectSoundCount = String(counts.sounds);
  runtime.container.dataset.areaObjectBackendRenderContractStatus =
    backendRenderContractDiagnostics.status;
  runtime.container.dataset.areaObjectBackendRenderContractTotal = String(
    backendRenderContractDiagnostics.total
  );
  runtime.container.dataset.areaObjectBackendRenderPayloadReadyCount = String(
    backendRenderContractDiagnostics.payloadReadyCount
  );
  runtime.container.dataset.areaObjectBackendRenderModelUrlReadyCount = String(
    backendRenderContractDiagnostics.modelUrlReadyCount
  );
  runtime.container.dataset.areaObjectCreatureRenderPayloadReadyCount = String(
    creatureRenderPayloadReadyCount
  );
  runtime.container.dataset.areaObjectCreatureRenderPackageReadyCount = String(
    creatureRenderPackageReadyCount
  );
  runtime.container.dataset.areaObjectCreatureRenderModelUrlReadyCount = String(
    creatureRenderModelUrlReadyCount
  );
  runtime.container.dataset.areaObjectCreatureRenderModelReadyCount = String(
    creatureRenderModelReadyCount
  );
  runtime.container.dataset.areaObjectCreatureRenderPayloadStatus =
    visibleCreatureObjects.length === 0
      ? "not-applicable"
      : creatureRenderPayloadReadyCount === visibleCreatureObjects.length
        ? "ready"
        : creatureRenderPayloadReadyCount > 0
          ? "partial"
          : "missing";
  runtime.container.dataset.areaObjectCreatureRenderModelStatus =
    visibleCreatureObjects.length === 0
      ? "not-applicable"
      : creatureRenderModelReadyCount === visibleCreatureObjects.length
        ? "ready"
        : creatureRenderModelReadyCount > 0 || creatureRenderModelUrlReadyCount > 0
          ? "partial"
          : "missing";
  runtime.container.dataset.areaObjectCreatureRenderPackageStatuses = visibleEvidenceObjects
    .map((object) =>
      object.kind === "creatures"
        ? (creatureRenderPayloadsByObjectId?.[object.id]?.renderPackage?.status ?? "missing")
        : "not-creature"
    )
    .join("|");
  runtime.container.dataset.areaObjectBackendRenderBlockedCount = String(
    backendRenderContractDiagnostics.blockedCount
  );
  runtime.container.dataset.areaObjectBackendRenderBlockedIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.blockedIds);
  runtime.container.dataset.areaObjectPrimitiveFallbackIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.primitiveFallbackIds);
  runtime.container.dataset.areaObjectSharedRendererPath = "shared-placeables-renderer";
  runtime.container.dataset.areaObjectSharedRendererStatus =
    backendRenderContractDiagnostics.status;
  runtime.container.dataset.areaObjectSharedRendererPlaceholderStatus =
    backendRenderContractDiagnostics.placeholderStatus;
  runtime.container.dataset.areaObjectSharedRendererPayloadBoundCount = String(
    backendRenderContractDiagnostics.payloadReadyCount
  );
  runtime.container.dataset.areaObjectSharedRendererModelReadyCount = String(
    backendRenderContractDiagnostics.modelReadyCount
  );
  runtime.container.dataset.areaObjectSharedRendererUniqueModelUrlCount = String(
    backendRenderContractDiagnostics.uniqueModelUrlCount
  );
  runtime.container.dataset.areaObjectSharedRendererUniqueModelCacheKeyCount = String(
    backendRenderContractDiagnostics.uniqueModelCacheKeyCount
  );
  runtime.container.dataset.areaObjectSharedRendererModelUrlSample =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.modelUrlSample);
  runtime.container.dataset.areaObjectSharedRendererModelCacheKeySample =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.modelCacheKeySample);
  runtime.container.dataset.areaObjectSharedRendererPrimitiveFallbackCount = String(
    backendRenderContractDiagnostics.primitiveFallbackCount
  );
  runtime.container.dataset.areaObjectSharedRendererPrimitiveFallbackRenderLimit = String(
    backendRenderContractDiagnostics.primitiveFallbackRenderLimit
  );
  runtime.container.dataset.areaObjectSharedRendererPrimitiveFallbackSuppressedCount = String(
    backendRenderContractDiagnostics.primitiveFallbackSuppressedCount
  );
  runtime.container.dataset.areaObjectSharedRendererMissingPayloadIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.missingPayloadIds);
  runtime.container.dataset.areaObjectSharedRendererPayloadMissingModelUrlIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.payloadMissingModelUrlIds);
  runtime.container.dataset.areaObjectSharedRendererAssetContractBlockedIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.assetContractBlockedIds);
  runtime.container.dataset.areaObjectSharedRendererModelLoadFailedIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.modelLoadFailedIds);
  runtime.container.dataset.areaObjectSharedRendererModelLoadFailedModelUrls =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.modelLoadFailedModelUrls);
  runtime.container.dataset.areaObjectSharedRendererModelLoadFailedModelCacheKeys =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.modelLoadFailedModelCacheKeys);
  runtime.container.dataset.areaObjectSharedRendererStillLoadingIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.stillLoadingIds);
  runtime.container.dataset.areaObjectSharedRendererPlaceholderReasonCounts = JSON.stringify(
    backendRenderContractDiagnostics.placeholderReasonCounts
  );
  runtime.container.dataset.areaObjectSharedRendererPlaceholderReasonIds = JSON.stringify(
    Object.fromEntries(
      AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
        reason,
        limitAreaRuntimeIdString(backendRenderContractDiagnostics.placeholderReasonIds[reason])
      ])
    )
  );
  writeAreaSharedRendererRuntimeSnapshot(runtime, backendRenderContractDiagnostics);
  safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
  scheduleAreaSharedRendererRuntimeSnapshotEvidenceRefresh(runtime);
  runtime.container.dataset.areaObjectRuntimeIdListLimit = String(
    AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
  );
  runtime.container.dataset.areaObjectRuntimeEvidenceLimit = String(
    AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
  );
  runtime.container.dataset.areaObjectRuntimeEvidenceRowCount = String(
    visibleEvidenceLimit.rowCount
  );
  runtime.container.dataset.areaObjectRuntimeEvidenceTruncatedCount = String(
    visibleEvidenceLimit.truncatedCount
  );
  runtime.container.dataset.areaObjectSourceIds = visibleEvidenceObjects
    .map((object) => object.source?.sourceObjectId ?? object.id)
    .join("|");
  runtime.container.dataset.areaObjectOrderKeys = visibleEvidenceObjects
    .map((object, index) => resolveAreaObjectOrderKey(object, index))
    .join("|");
  runtime.container.dataset.areaObjectOrderEvidence = visibleEvidenceObjects
    .map((object, index) => resolveAreaObjectDatasetEvidence(object, index))
    .join("|");
  runtime.container.dataset.areaObjectModelContractEvidence = visibleEvidenceObjects
    .map((object, index) =>
      resolveAreaObjectModelContractEvidence(
        object,
        index,
        placeableRenderPayloadsByObjectId?.[object.id] ?? null
      )
    )
    .join("|");
  runtime.container.dataset.areaObjectLookupContractEvidence = visibleEvidenceObjects
    .map((object, index) =>
      resolveAreaObjectLookupContractEvidence(
        object,
        index,
        placeableRenderPayloadsByObjectId?.[object.id] ?? null
      )
    )
    .join("|");
  const doorTransitionStatuses = visibleObjects.map((object) =>
    resolveAreaObjectDoorTransitionStatus(object)
  );
  runtime.container.dataset.areaObjectDoorTransitionStatus =
    resolveAreaObjectDoorTransitionAggregateStatus(doorTransitionStatuses);
  runtime.container.dataset.areaObjectDoorTransitionEvidence = visibleEvidenceObjects
    .map((object, index) => resolveAreaObjectDoorTransitionEvidence(object, index))
    .join("|");
  runtime.container.dataset.areaObjectSelectedCount = String(selectedVisibleObjects.length);
  runtime.container.dataset.areaObjectSelectedStatus =
    selectedVisibleObjects.length === 0
      ? "none"
      : selectedFallbackCount === 0
        ? "source-backed"
        : selectedAuroraGitCount > 0
          ? "mixed-source-fallback"
          : "fallback";
  runtime.container.dataset.areaObjectSelectedIds = selectedVisibleObjects
    .map((object) => object.id)
    .join("|");
  runtime.container.dataset.areaObjectSelectedSourceIds = selectedVisibleObjects
    .map((object) => resolveAreaObjectDatasetSourceId(object))
    .join("|");
  runtime.container.dataset.areaObjectSelectedOrderKeys = selectedVisibleObjects
    .map((object) =>
      resolveAreaObjectOrderKey(object, visibleObjectIndexById.get(object.id) ?? 0)
    )
    .join("|");
  runtime.container.dataset.areaObjectSelectedEvidence = selectedVisibleObjects
    .map((object) =>
      resolveAreaObjectDatasetEvidence(object, visibleObjectIndexById.get(object.id) ?? 0)
    )
    .join("|");
  const selectedModelContractStatuses = selectedVisibleObjects.map((object) =>
    resolveAreaObjectModelContractStatus(
      object,
      placeableRenderPayloadsByObjectId?.[object.id] ?? null
    )
  );
  runtime.container.dataset.areaObjectSelectedModelContractStatus =
    resolveAreaObjectSelectedModelContractStatus(selectedModelContractStatuses);
  runtime.container.dataset.areaObjectSelectedModelContractEvidence = selectedVisibleObjects
    .map((object) =>
      resolveAreaObjectModelContractEvidence(
        object,
        visibleObjectIndexById.get(object.id) ?? 0,
        placeableRenderPayloadsByObjectId?.[object.id] ?? null
      )
    )
    .join("|");
  const selectedLookupContractStatuses = selectedVisibleObjects.map((object) =>
    resolveAreaObjectLookupContractStatus(
      object,
      placeableRenderPayloadsByObjectId?.[object.id] ?? null
    )
  );
  runtime.container.dataset.areaObjectSelectedLookupContractStatus =
    resolveAreaObjectSelectedModelContractStatus(selectedLookupContractStatuses);
  runtime.container.dataset.areaObjectSelectedLookupContractEvidence = selectedVisibleObjects
    .map((object) =>
      resolveAreaObjectLookupContractEvidence(
        object,
        visibleObjectIndexById.get(object.id) ?? 0,
        placeableRenderPayloadsByObjectId?.[object.id] ?? null
      )
    )
    .join("|");
  const selectedDoorTransitionStatuses = selectedVisibleObjects.map((object) =>
    resolveAreaObjectDoorTransitionStatus(object)
  );
  runtime.container.dataset.areaObjectSelectedDoorTransitionStatus =
    resolveAreaObjectDoorTransitionAggregateStatus(selectedDoorTransitionStatuses);
  runtime.container.dataset.areaObjectSelectedDoorTransitionEvidence = selectedVisibleObjects
    .map((object) =>
      resolveAreaObjectDoorTransitionEvidence(
        object,
        visibleObjectIndexById.get(object.id) ?? 0
      )
    )
    .join("|");
  safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
}

function framePlaceablesVfxPreviewIfNeeded(
  runtime: RuntimeState,
  visibleObjects: SceneObject[],
  renderPayloadsByObjectId: Record<string, PlaceableViewportRenderPayload> | null
): void {
  if (visibleObjects.length !== 1) {
    return;
  }
  const object = visibleObjects[0];
  if (!object || !isPlaceablesVfxPreviewObject(object, renderPayloadsByObjectId?.[object.id])) {
    return;
  }
  const target = findVfxPreviewFrameTarget(runtime.objectMeshById.get(object.id) ?? null);
  if (!target) {
    return;
  }
  const bounds = new THREE.Box3().setFromObject(target);
  if (bounds.isEmpty()) {
    return;
  }
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bounds.getCenter(center);
  bounds.getSize(size);
  const span = Math.max(size.x, size.y, size.z, 0.45);
  const distance = Math.max(1.35, span * 3.1);
  runtime.controls.target.copy(center);
  runtime.camera.position.set(
    center.x + distance * 0.58,
    center.y + Math.max(0.55, span * 1.25),
    center.z + distance * 0.92
  );
  runtime.camera.lookAt(center);
  runtime.controls.update();
}

interface WorkspaceCanvasViewportProps {
  toolbarState: WorkspaceToolbarState;
  userId: string;
  sceneViewportPort: SceneViewportPort;
  clientAssetCachePort?: ClientAssetCachePort;
  areaLifecycleFacade?: AreaLifecycleFacade<AreaWorkspaceDraftDocument>;
  areaDraftSessionRegistry?: AreaDraftSessionRegistry;
  onAreaDraftPersisted?: () => void;
  onAreaWorkspaceStatusChange?: (event: AreaWorkspaceStatusEvent) => void;
  viewportFacade?: WorkspaceCanvasViewportFacade;
  trackTelemetryEvent?: WorkspaceCanvasTelemetryTrack;
  commandSignal: WorkspaceCommandSignal | null;
  sidebarSelectSignal?: {
    revision: number;
    objectId: string;
    additive: boolean;
    sourceType: string;
    allowedObjectIds: string[];
  } | null;
  sidebarContextMenuSignal?: {
    revision: number;
    objectId: string;
    objectKind: SceneObjectKind;
    clientX: number;
    clientY: number;
  } | null;
  sidebarPropertiesSignal?: {
    revision: number;
    objectId: string;
    objectKind: SceneObjectKind;
  } | null;
  canvasCreateObjectSignal?: {
    revision: number;
    template: SceneObject;
  } | null;
  catalogScope?: {
    sourceType: string;
    allowedObjectIds: string[];
  } | null;
  workspaceOptions: WorkspaceOptionSettings;
  leftPanelWidthPx: number;
  rightPanelWidthPx: number;
  viewportFullscreen?: boolean;
  onSceneObjectsSnapshotChange?: (objects: SceneObject[]) => void;
  onSelectionSnapshotChange?: (selectedIds: string[]) => void;
  onObjectAddPlacementModeChange?: (
    placement:
      | {
          templateId: string;
          objectKind: SceneObjectKind;
          tag: string;
        }
      | null
  ) => void;
  externalSceneSeed?: AreaScene | null;
  areaEditorMutationSignal?: WorkspaceAreaEditorMutationSignal | null;
  onAreaEditorMutationApplied?: (revision: number) => void;
  areaEditingTool?: AuroraAreaEditingTool;
  tileProductionCertification: AreaTileProductionCertificationSource;
  onAreaSceneDraftChange?: (scene: AreaScene) => void;
  onSelectedTileChange?: (tileId: string | null, tileIds: readonly string[]) => void;
  renderObjectIds?: string[] | null;
  areaCanvasLoading?: WorkspaceAreaCanvasLoadingState | null;
  areaTileProcessReadiness?: AreaTileProcessContractReadiness | null;
  placeableRenderPayloadByObjectId?: Record<string, PlaceableViewportRenderPayload> | null;
  creatureRenderPayloadByObjectId?: Record<string, CreatureViewportRenderPayload> | null;
  creatureResourceOptions?: Partial<
    Record<"conversation" | "portrait" | "script" | "soundset", CreatureApiResourceOption[]>
  >;
  creatureAppearanceCatalogFacade?: CreatureAppearanceCatalogFacade;
  creatureGenderCatalogFacade?: CreatureGenderCatalogFacade;
  creatureAppendageCatalogFacade?: CreatureAppendageCatalogFacade;
  creaturePerceptionRangeCatalogFacade?: CreaturePerceptionRangeCatalogFacade;
  creatureWalkRateCatalogFacade?: CreatureWalkRateCatalogFacade;
  creatureSoundSetCatalogFacade?: CreatureSoundSetCatalogFacade;
  creatureStartingPackageCatalogFacade?: CreatureStartingPackageCatalogFacade;
  creatureClassCatalogFacade?: CreatureClassCatalogFacade;
  creatureSkillCatalogFacade?: CreatureSkillCatalogFacade;
  creatureFeatCatalogFacade?: CreatureFeatCatalogFacade;
  creatureSpecialAbilityCatalogFacade?: CreatureSpecialAbilityCatalogFacade;
  creaturePhenotypeCatalogFacade?: CreaturePhenotypeCatalogFacade;
  creatureAppearanceAccessToken?: string | null;
  creatureTemplateOptions?: readonly SceneObject[];
  itemTemplateOptions?: SceneObject[];
  soundTemplateOptions?: readonly SceneObject[];
  placeableAssetAccessToken?: string | null;
  placeableApiPort?: Pick<PlaceableApiPort, "listPlaceableAppearanceRows">;
  waypointAppearanceAccessToken?: string | null;
  waypointApiPort?: Pick<WaypointApiPort, "listWaypointAppearanceRows">;
  onPlaceableAssetCacheMiss?: (detail: PlaceableAssetCacheMissEventDetail) => void;
  onItemPreviewObjectNeeded?: (object: SceneObject) => Promise<SceneObject>;
  onItemPropertiesApplied?: (object: SceneObject, previousObject: SceneObject) => void;
  onCreaturePropertiesApplied?: (object: SceneObject, previousObject: SceneObject) => void;
  showGizmoModeBadge?: boolean;
}

interface WorkspacePlaceableAppearanceCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingPlaceableAppearanceCatalog | null;
}

interface WorkspaceWaypointAppearanceCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingWaypointAppearanceCatalog | null;
}

interface WorkspaceCreatureAppearanceCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingCreatureAppearanceCatalog | null;
  readonly errorMessage: string | null;
}

interface WorkspaceCreatureGenderCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingCreatureGenderCatalog | null;
  readonly errorMessage: string | null;
}

interface WorkspaceCreatureAppendageCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingCreatureAppendageCatalog | null;
  readonly errorMessage: string | null;
}

interface WorkspaceCreaturePerceptionRangeCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingCreaturePerceptionRangeCatalog | null;
  readonly errorMessage: string | null;
}

interface WorkspaceCreatureWalkRateCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingCreatureWalkRateCatalog | null;
  readonly errorMessage: string | null;
}

interface WorkspaceCreatureSoundSetCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingCreatureSoundSetCatalog | null;
  readonly errorMessage: string | null;
}

interface WorkspaceCreatureStartingPackageCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingCreatureStartingPackageCatalog | null;
  readonly errorMessage: string | null;
}

interface WorkspaceCreatureClassCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingCreatureClassCatalog | null;
  readonly errorMessage: string | null;
}

interface WorkspaceCreatureSkillCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingCreatureSkillCatalog | null;
  readonly errorMessage: string | null;
}

interface WorkspaceCreatureFeatCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingCreatureFeatCatalog | null;
  readonly errorMessage: string | null;
}

interface WorkspaceCreatureSpecialAbilityCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingCreatureSpecialAbilityCatalog | null;
  readonly errorMessage: string | null;
}

interface WorkspaceCreaturePhenotypeCatalogState {
  readonly objectId: string;
  readonly status: "unavailable" | "loading" | "ready" | "error";
  readonly catalog: ExistingCreaturePhenotypeCatalog | null;
  readonly errorMessage: string | null;
}

export interface WorkspaceAreaEditorMutationSignal {
  revision: number;
  scene: AreaScene;
  selectedTileId?: string | null;
  selectedTileIds?: string[];
}

export function resolveWorkspaceAreaEditorMutationSelectedTileId(
  currentSelectedTileId: string | null,
  signal: WorkspaceAreaEditorMutationSignal,
  appliedRevision: number,
  currentSceneId: string
): string | null {
  if (
    signal.revision <= appliedRevision ||
    signal.scene.sceneId !== currentSceneId
  ) {
    return currentSelectedTileId;
  }
  return signal.selectedTileId === undefined
    ? currentSelectedTileId
    : signal.selectedTileId;
}

export function shouldApplyWorkspaceExternalSceneSeed(
  previouslyObservedSeed: AreaScene | null | undefined,
  nextSeed: AreaScene | null | undefined,
  currentScene: AreaScene | null,
  pendingAreaEditorMutationScene?: AreaScene | null
): boolean {
  return Boolean(
    nextSeed &&
      nextSeed !== previouslyObservedSeed &&
      nextSeed !== currentScene &&
      nextSeed !== pendingAreaEditorMutationScene
  );
}

export function resolveWorkspaceCommandRevisionAfterSceneReset(
  handledRevision: number,
  latestCommandRevision: number | null,
): number {
  return latestCommandRevision === null
    ? handledRevision
    : Math.max(handledRevision, latestCommandRevision);
}

export function shouldPublishWorkspaceAreaSceneDraft(
  externalSceneSeed: AreaScene | null | undefined,
  observedExternalSceneSeed: AreaScene | null | undefined,
  scene: AreaScene
): boolean {
  return Boolean(
    externalSceneSeed &&
      scene.sceneId === externalSceneSeed.sceneId &&
      externalSceneSeed === observedExternalSceneSeed
  );
}

export interface WorkspaceAreaCanvasLoadingState {
  source: "areas" | "terrain" | "textures";
  label: string;
  completed?: number | null;
  total?: number | null;
  inFlight?: number | null;
  queued?: number | null;
  currentLabel?: string | null;
}

export function applyWorkspaceAreaEditorMutationSignal(
  history: SceneHistoryState,
  signal: WorkspaceAreaEditorMutationSignal,
  appliedRevision: number,
  sceneViewportPort: Pick<SceneViewportPort, "commitHistory">
): { history: SceneHistoryState; appliedRevision: number } {
  if (signal.revision <= appliedRevision) {
    return { history, appliedRevision };
  }

  if (signal.scene.sceneId !== history.present.sceneId) {
    return { history, appliedRevision: signal.revision };
  }

  return {
    history: sceneViewportPort.commitHistory(history, signal.scene),
    appliedRevision: signal.revision
  };
}

export function useWorkspaceAreaEditorMutationSignal(
  signal: WorkspaceAreaEditorMutationSignal | null | undefined,
  currentSceneId: string,
  sceneViewportPort: Pick<SceneViewportPort, "commitHistory">,
  setSceneHistory: (value: SetStateAction<SceneHistoryState>) => void,
  setSelectedTileId: (value: SetStateAction<string | null>) => void,
  onApplied?: (revision: number) => void
): void {
  const appliedRevisionRef = useRef(0);

  useEffect(() => {
    if (!signal || signal.revision <= appliedRevisionRef.current) {
      return;
    }

    // React StrictMode may evaluate a functional state updater more than once.
    // Capture the previous revision so every evaluation is pure and produces
    // the same committed history, then consume the signal outside the updater.
    const previouslyAppliedRevision = appliedRevisionRef.current;
    setSelectedTileId((current) =>
      resolveWorkspaceAreaEditorMutationSelectedTileId(
        current,
        signal,
        previouslyAppliedRevision,
        currentSceneId
      )
    );
    setSceneHistory((current) =>
      applyWorkspaceAreaEditorMutationSignal(
        current,
        signal,
        previouslyAppliedRevision,
        sceneViewportPort
      ).history
    );
    appliedRevisionRef.current = signal.revision;
    if (signal.scene.sceneId === currentSceneId) {
      onApplied?.(signal.revision);
    }
  }, [
    currentSceneId,
    onApplied,
    sceneViewportPort,
    setSceneHistory,
    setSelectedTileId,
    signal
  ]);
}

interface AdjustLocationDialogState {
  objectIds: string[];
  snapshotObjects: SceneObject[];
  draft: AdjustLocationDraft;
  showVisualTransforms: boolean;
  mixedStaticPlaceables: boolean;
  windowX: number;
  windowY: number;
  collapsed: boolean;
}

interface AreaObjectPolygonDialogState extends AnchoredDialogPositionState {
  objectId: string;
  objectKind: "triggers" | "encounters";
  snapshotObject: SceneObject;
  draft: AreaObjectPolygonDraft;
  validationMessage: string | null;
  windowX: number;
  windowY: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
  collapsed: boolean;
}

const ADJUST_LOCATION_DIALOG_MARGIN_PX = 12;
const ADJUST_LOCATION_DIALOG_FALLBACK_WIDTH_PX = 520;
const ADJUST_LOCATION_DIALOG_FALLBACK_HEIGHT_PX = 420;
const PLACEABLE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 820;
const PLACEABLE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 540;
const CREATURE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 840;
const CREATURE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 620;
const ITEM_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 920;
const ITEM_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 620;
const SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 760;
const SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 520;
const DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 760;
const DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 520;
const AREA_OBJECT_POLYGON_DIALOG_FALLBACK_WIDTH_PX = 720;
const AREA_OBJECT_POLYGON_DIALOG_FALLBACK_HEIGHT_PX = 540;
const STORE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 620;
const STORE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 420;
const WAYPOINT_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 520;
const WAYPOINT_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 280;

function countChangedStoreVariableEntries(
  left: NonNullable<StorePropertiesDraft["variables"]>,
  right: NonNullable<StorePropertiesDraft["variables"]>,
): number {
  const count = Math.max(left.length, right.length);
  let changed = 0;
  for (let index = 0; index < count; index += 1) {
    const source = left[index];
    const target = right[index];
    if (!source || !target || source.name !== target.name || source.type !== target.type ||
      !Object.is(source.value, target.value)) {
      changed += 1;
    }
  }
  return changed;
}

function countChangedStoreRestrictionEntries(
  left: NonNullable<StorePropertiesDraft["restrictions"]>,
  right: NonNullable<StorePropertiesDraft["restrictions"]>,
): number {
  const countListChanges = (source: readonly number[], target: readonly number[]) => {
    const count = Math.max(source.length, target.length);
    let changed = 0;
    for (let index = 0; index < count; index += 1) {
      if (source[index] !== target[index]) changed += 1;
    }
    return changed;
  };
  return countListChanges(left.willNotBuy, right.willNotBuy) +
    countListChanges(left.willOnlyBuy, right.willOnlyBuy);
}
const AREA_OBJECT_POLYGON_DIALOG_KINDS = ["triggers", "encounters"] as const;
const ASSET_LOADING_RENDER_INTERVAL_MS = 80;
const PERF_SNAPSHOT_INTERVAL_MS = 300;
const AREA_FOCUSED_PERSPECTIVE_CAMERA_EVENT = "aurora:areas:focused-perspective-camera";
const AREA_ORACLE_TOP_DOWN_CAMERA_EVENT = "aurora:areas:oracle-top-down-camera";
const AREA_ORACLE_RENDER_VISIBILITY_EVENT = "aurora:areas:oracle-render-visibility";

interface AuroraCreatureProofRuntimeHook {
  sampleAnimationState: (timeSeconds: number) => {
    ok: boolean;
    issue?: string;
    requestedTimeSeconds: number;
    width: number;
    height: number;
    dataUrl: string;
    dataset: Record<string, string>;
    sceneGraph: ReturnType<typeof collectAuroraCreatureProofSceneGraph>;
    samples: ReturnType<typeof sampleRuntimeObjectAnimationAtTime>;
  };
  sampleAnimationFrame: (timeSeconds: number) => {
    ok: boolean;
    issue?: string;
    requestedTimeSeconds: number;
    width: number;
    height: number;
    dataUrl: string;
    dataset: Record<string, string>;
    sceneGraph: ReturnType<typeof collectAuroraCreatureProofSceneGraph>;
    samples: ReturnType<typeof sampleRuntimeObjectAnimationAtTime>;
  };
}

interface AuroraAreaRuntimeCaptureResult {
  ok: boolean;
  issue?: string;
  requestedObjectId: string;
  requestedObjectIds?: string[];
  matchedObjectId: string;
  matchedObjectIds?: string[];
  matchedObjectName: string;
  matchedObjectNames?: string[];
  visibleObjectCount: number;
  highlightedObjectCount?: number;
  width: number;
  height: number;
  dataUrl: string;
  dataset: Record<string, string>;
  camera: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    up: { x: number; y: number; z: number };
    fov: number;
    near: number;
    far: number;
    frameMode: string;
    frameTarget: string;
    frameDistance: string;
    frameSource: string;
  };
}

interface AuroraAreaRuntimeCaptureHook {
  captureCanvasFrame: () => AuroraAreaRuntimeCaptureResult;
  captureIsolatedObjectFrame: (objectId: string) => AuroraAreaRuntimeCaptureResult;
  captureHighlightedObjectFrame: (objectIds: string[]) => AuroraAreaRuntimeCaptureResult;
}

function formatAuroraCreatureProofVector(value: THREE.Vector3): string {
  return `${value.x.toFixed(4)},${value.y.toFixed(4)},${value.z.toFixed(4)}`;
}

function isAuroraCreatureProofNodeVisible(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) {
      return false;
    }
    current = current.parent;
  }
  if (node instanceof THREE.Mesh) {
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    return materials.some((material) => material.visible !== false);
  }
  return true;
}

function collectAuroraCreatureProofAncestorPath(node: THREE.Object3D): string {
  const names: string[] = [];
  let current: THREE.Object3D | null = node;
  while (current && names.length < 10) {
    names.push(current.name || current.type || "(unnamed)");
    current = current.parent;
  }
  return names.join(">");
}

function isAuroraCreatureProofEquipmentMesh(node: THREE.Mesh): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (
      current.userData?.creatureEquipmentModelPartMeshStatus === "flat-composed" ||
      current.userData?.creatureEquipmentModelPartStatus === "loaded" ||
      current.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function resolveAuroraCreatureProofEquipmentTarget(node: THREE.Object3D): string {
  let current: THREE.Object3D | null = node;
  while (current) {
    const target =
      typeof current.userData?.creatureEquipmentModelPartAttachmentTarget === "string"
        ? current.userData.creatureEquipmentModelPartAttachmentTarget
        : typeof current.userData?.creatureEquipmentModelPartItemAttachmentTarget === "string"
          ? current.userData.creatureEquipmentModelPartItemAttachmentTarget
          : "";
    if (target) {
      return target;
    }
    current = current.parent;
  }
  return "";
}

export function collectAuroraCreatureProofSceneGraph(runtime: RuntimeState): {
  objectRootCount: number;
  objectRootNames: string[];
  objectRootChildNames: string[];
  meshCount: number;
  visibleMeshCount: number;
  visibleMeshNames: string[];
  visibleMeshPaths: string[];
  visibleMeshCenters: string[];
  visibleMeshSizes: string[];
  equipmentVisibleMeshCount: number;
  equipmentVisibleMeshNames: string[];
  equipmentVisibleMeshTargets: string[];
  equipmentVisibleMeshPaths: string[];
  equipmentVisibleMeshCenters: string[];
  equipmentVisibleMeshSizes: string[];
} {
  const objectRoots = Array.from(runtime.objectMeshById.values());
  const visibleMeshNames: string[] = [];
  const visibleMeshPaths: string[] = [];
  const visibleMeshCenters: string[] = [];
  const visibleMeshSizes: string[] = [];
  const equipmentVisibleMeshNames: string[] = [];
  const equipmentVisibleMeshTargets: string[] = [];
  const equipmentVisibleMeshPaths: string[] = [];
  const equipmentVisibleMeshCenters: string[] = [];
  const equipmentVisibleMeshSizes: string[] = [];
  let meshCount = 0;
  let visibleMeshCount = 0;
  let equipmentVisibleMeshCount = 0;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  objectRoots.forEach((root) => {
    root.updateMatrixWorld(true);
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      meshCount += 1;
      if (!isAuroraCreatureProofNodeVisible(node)) {
        return;
      }
      visibleMeshCount += 1;
      const isEquipmentMesh = isAuroraCreatureProofEquipmentMesh(node);
      if (isEquipmentMesh) {
        equipmentVisibleMeshCount += 1;
      }
      if (visibleMeshNames.length >= 96) {
        return;
      }
      const meshName = node.name || node.parent?.name || "(unnamed)";
      const ancestorPath = collectAuroraCreatureProofAncestorPath(node);
      visibleMeshNames.push(meshName);
      visibleMeshPaths.push(ancestorPath);
      const box = new THREE.Box3().setFromObject(node);
      if (box.isEmpty()) {
        visibleMeshCenters.push(`${meshName}:empty`);
        visibleMeshSizes.push(`${meshName}:empty`);
        if (isEquipmentMesh && equipmentVisibleMeshNames.length < 96) {
          equipmentVisibleMeshNames.push(meshName);
          equipmentVisibleMeshTargets.push(resolveAuroraCreatureProofEquipmentTarget(node));
          equipmentVisibleMeshPaths.push(ancestorPath);
          equipmentVisibleMeshCenters.push(`${meshName}:empty`);
          equipmentVisibleMeshSizes.push(`${meshName}:empty`);
        }
        return;
      }
      box.getCenter(center);
      box.getSize(size);
      visibleMeshCenters.push(
        `${meshName}:${formatAuroraCreatureProofVector(center)}`
      );
      visibleMeshSizes.push(
        `${meshName}:${formatAuroraCreatureProofVector(size)}`
      );
      if (isEquipmentMesh && equipmentVisibleMeshNames.length < 96) {
        equipmentVisibleMeshNames.push(meshName);
        equipmentVisibleMeshTargets.push(resolveAuroraCreatureProofEquipmentTarget(node));
        equipmentVisibleMeshPaths.push(ancestorPath);
        equipmentVisibleMeshCenters.push(
          `${meshName}:${formatAuroraCreatureProofVector(center)}`
        );
        equipmentVisibleMeshSizes.push(
          `${meshName}:${formatAuroraCreatureProofVector(size)}`
        );
      }
    });
  });

  return {
    objectRootCount: objectRoots.length,
    objectRootNames: objectRoots.map((root) => root.name || root.type || "(unnamed)"),
    objectRootChildNames: objectRoots.flatMap((root) =>
      root.children.map((child) => child.name || child.type || "(unnamed)")
    ),
    meshCount,
    visibleMeshCount,
    visibleMeshNames,
    visibleMeshPaths,
    visibleMeshCenters,
    visibleMeshSizes,
    equipmentVisibleMeshCount,
    equipmentVisibleMeshNames,
    equipmentVisibleMeshTargets,
    equipmentVisibleMeshPaths,
    equipmentVisibleMeshCenters,
    equipmentVisibleMeshSizes
  };
}

export function installAuroraCreatureProofRuntimeHook(runtime: RuntimeState): void {
  const targetWindow = window as typeof window & {
    __auroraCreatureProofRuntime?: AuroraCreatureProofRuntimeHook;
  };
  const sampleRuntime = (timeSeconds: number, includeDataUrl: boolean) => {
    const requestedTimeSeconds = Number.isFinite(timeSeconds)
      ? Math.max(0, timeSeconds)
      : 0;
    const samples = sampleRuntimeObjectAnimationAtTime(runtime, requestedTimeSeconds);
    let dataUrl = "";
    if (includeDataUrl) {
      renderRuntime(runtime);
      try {
        dataUrl = runtime.renderer.domElement.toDataURL("image/png");
      } catch (error) {
        return {
          ok: false,
          issue: error instanceof Error ? error.message : String(error),
          requestedTimeSeconds,
          width: runtime.renderer.domElement.width,
          height: runtime.renderer.domElement.height,
          dataUrl: "",
          dataset: { ...runtime.container.dataset } as Record<string, string>,
          sceneGraph: collectAuroraCreatureProofSceneGraph(runtime),
          samples
        };
      }
    }
    return {
      ok: true,
      requestedTimeSeconds,
      width: runtime.renderer.domElement.width,
      height: runtime.renderer.domElement.height,
      dataUrl,
      dataset: { ...runtime.container.dataset } as Record<string, string>,
      sceneGraph: collectAuroraCreatureProofSceneGraph(runtime),
      samples
    };
  };
  targetWindow.__auroraCreatureProofRuntime = {
    sampleAnimationState: (timeSeconds: number) => sampleRuntime(timeSeconds, false),
    sampleAnimationFrame: (timeSeconds: number) => {
      return sampleRuntime(timeSeconds, true);
    }
  };
}

export function uninstallAuroraCreatureProofRuntimeHook(runtime: RuntimeState): void {
  void runtime;
  const targetWindow = window as typeof window & {
    __auroraCreatureProofRuntime?: AuroraCreatureProofRuntimeHook;
  };
  if (targetWindow.__auroraCreatureProofRuntime) {
    delete targetWindow.__auroraCreatureProofRuntime;
  }
}

function installAuroraAreaRuntimeCaptureHook(runtime: RuntimeState): void {
  const targetWindow = window as typeof window & {
    __auroraAreaRuntimeCapture?: AuroraAreaRuntimeCaptureHook;
  };
  const readCameraEvidence = (): AuroraAreaRuntimeCaptureResult["camera"] => ({
    position: formatAreaRuntimeVector(runtime.camera.position),
    target: formatAreaRuntimeVector(runtime.controls.target),
    up: formatAreaRuntimeVector(runtime.camera.up),
    fov: roundAreaRuntimeNumber(runtime.camera.fov),
    near: roundAreaRuntimeNumber(runtime.camera.near),
    far: roundAreaRuntimeNumber(runtime.camera.far),
    frameMode: runtime.container.dataset.areaCameraFrameMode ?? "",
    frameTarget: runtime.container.dataset.areaCameraFrameTarget ?? "",
    frameDistance: runtime.container.dataset.areaCameraFrameDistance ?? "",
    frameSource: runtime.container.dataset.areaCameraFrameSource ?? ""
  });
  const findRuntimeObjectMatch = (
    objectId: string
  ): [string, THREE.Object3D] | null => {
    const normalized = objectId.trim();
    return (
      Array.from(runtime.objectMeshById.entries()).find(
        ([candidateObjectId]) =>
          candidateObjectId === normalized ||
          candidateObjectId.endsWith(`:${normalized}`) ||
          candidateObjectId.endsWith(normalized)
      ) ?? null
    );
  };
  const captureFrame = (
    isolatedObjectId: string | null = null,
    highlightedObjectIds: string[] = []
  ): ReturnType<AuroraAreaRuntimeCaptureHook["captureIsolatedObjectFrame"]> => {
    const restoreVisibility: Array<[THREE.Object3D, boolean]> = [];
    const restoreMaterials: Array<
      [THREE.Mesh, THREE.Material | THREE.Material[], number]
    > = [];
    const highlightMaterials: THREE.Material[] = [];
    let matchedObjectId = "";
    let matchedObjectName = "";
    const requestedObjectIds = highlightedObjectIds
      .map((objectId) => objectId.trim())
      .filter(Boolean);
    const matchedObjectIds: string[] = [];
    const matchedObjectNames: string[] = [];
    let isolatedObjectRoot: THREE.Object3D | null = null;
    if (isolatedObjectId) {
      const normalized = isolatedObjectId.trim();
      const match = findRuntimeObjectMatch(normalized);
      if (!match) {
        return {
          ok: false,
          issue: `object_not_found:${normalized}`,
          requestedObjectId: normalized,
          matchedObjectId: "",
          matchedObjectName: "",
          visibleObjectCount: 0,
          width: runtime.renderer.domElement.width,
          height: runtime.renderer.domElement.height,
          dataUrl: "",
          dataset: { ...runtime.container.dataset } as Record<string, string>,
          camera: readCameraEvidence()
        };
      }
      matchedObjectId = match[0];
      matchedObjectName = match[1].name || match[0];
      isolatedObjectRoot = match[1];
      const visibleSet = new Set<THREE.Object3D>();
      let current: THREE.Object3D | null = isolatedObjectRoot;
      while (current) {
        visibleSet.add(current);
        current = current.parent;
      }
      isolatedObjectRoot.traverse((node) => {
        visibleSet.add(node);
      });
      runtime.scene.traverse((node) => {
        if (node === runtime.scene) {
          return;
        }
        restoreVisibility.push([node, node.visible]);
        const keepVisible = visibleSet.has(node) || node instanceof THREE.Light;
        if (!keepVisible) {
          node.visible = false;
        }
      });
    }
    if (requestedObjectIds.length > 0) {
      const palette = [0xff304c, 0xffd400, 0x459bff, 0x00ffb8, 0xff7a00, 0xdb58ff];
      for (const requestedObjectId of requestedObjectIds) {
        const match = findRuntimeObjectMatch(requestedObjectId);
        if (!match) {
          return {
            ok: false,
            issue: `object_not_found:${requestedObjectId}`,
            requestedObjectId: requestedObjectIds.join(","),
            requestedObjectIds,
            matchedObjectId: "",
            matchedObjectIds,
            matchedObjectName: "",
            matchedObjectNames,
            visibleObjectCount: runtime.objectMeshById.size,
            highlightedObjectCount: matchedObjectIds.length,
            width: runtime.renderer.domElement.width,
            height: runtime.renderer.domElement.height,
            dataUrl: "",
            dataset: { ...runtime.container.dataset } as Record<string, string>,
            camera: readCameraEvidence()
          };
        }
        matchedObjectIds.push(match[0]);
        matchedObjectNames.push(match[1].name || match[0]);
      }
      const materialByObjectId = new Map<string, THREE.Material>();
      matchedObjectIds.forEach((objectId, index) => {
        const material = new THREE.MeshBasicMaterial({
          color: palette[index % palette.length],
          transparent: true,
          opacity: 0.86,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        highlightMaterials.push(material);
        materialByObjectId.set(objectId, material);
      });
      matchedObjectIds.forEach((objectId, index) => {
        const root = runtime.objectMeshById.get(objectId);
        const material = materialByObjectId.get(objectId);
        if (!root || !material) {
          return;
        }
        root.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) {
            return;
          }
          restoreMaterials.push([node, node.material, node.renderOrder]);
          node.material = material;
          node.renderOrder = 10_000 + index;
        });
      });
    }
    try {
      const preserveFocusedPerspectiveCamera =
        runtime.container.dataset.areaCameraFrameMode === "focused_perspective";
      if (!preserveFocusedPerspectiveCamera) {
        applyTopDownOracleCameraLock(runtime);
      }
      runtime.camera.updateMatrixWorld(true);
      renderRuntime(runtime);
      const gl = runtime.renderer.getContext();
      gl.flush();
      gl.finish();
      writeAreaPresentedFrameDataset(runtime.container.dataset);
      return {
        ok: true,
        requestedObjectId: isolatedObjectId ?? requestedObjectIds.join(","),
        requestedObjectIds: requestedObjectIds.length > 0 ? requestedObjectIds : undefined,
        matchedObjectId: matchedObjectId || matchedObjectIds.join(","),
        matchedObjectIds: matchedObjectIds.length > 0 ? matchedObjectIds : undefined,
        matchedObjectName: matchedObjectName || matchedObjectNames.join(","),
        matchedObjectNames: matchedObjectNames.length > 0 ? matchedObjectNames : undefined,
        visibleObjectCount: isolatedObjectId ? 1 : runtime.objectMeshById.size,
        highlightedObjectCount: matchedObjectIds.length || undefined,
        width: runtime.renderer.domElement.width,
        height: runtime.renderer.domElement.height,
        dataUrl: runtime.renderer.domElement.toDataURL("image/png"),
        dataset: { ...runtime.container.dataset } as Record<string, string>,
        camera: readCameraEvidence()
      };
    } catch (error) {
      return {
        ok: false,
        issue: error instanceof Error ? error.message : String(error),
        requestedObjectId: isolatedObjectId ?? requestedObjectIds.join(","),
        requestedObjectIds: requestedObjectIds.length > 0 ? requestedObjectIds : undefined,
        matchedObjectId: matchedObjectId || matchedObjectIds.join(","),
        matchedObjectIds: matchedObjectIds.length > 0 ? matchedObjectIds : undefined,
        matchedObjectName: matchedObjectName || matchedObjectNames.join(","),
        matchedObjectNames: matchedObjectNames.length > 0 ? matchedObjectNames : undefined,
        visibleObjectCount: isolatedObjectId ? 1 : runtime.objectMeshById.size,
        highlightedObjectCount: matchedObjectIds.length || undefined,
        width: runtime.renderer.domElement.width,
        height: runtime.renderer.domElement.height,
        dataUrl: "",
        dataset: { ...runtime.container.dataset } as Record<string, string>,
        camera: readCameraEvidence()
      };
    } finally {
      restoreMaterials.forEach(([mesh, material, renderOrder]) => {
        mesh.material = material;
        mesh.renderOrder = renderOrder;
      });
      highlightMaterials.forEach((material) => {
        material.dispose();
      });
      restoreVisibility.forEach(([root, visible]) => {
        root.visible = visible;
      });
      if (restoreVisibility.length > 0 || restoreMaterials.length > 0) {
        renderRuntime(runtime);
      }
    }
  };
  targetWindow.__auroraAreaRuntimeCapture = {
    captureCanvasFrame: () => {
      return captureFrame();
    },
    captureIsolatedObjectFrame: (objectId: string) => {
      return captureFrame(objectId);
    },
    captureHighlightedObjectFrame: (objectIds: string[]) => {
      return captureFrame(null, objectIds);
    }
  };
}

function uninstallAuroraAreaRuntimeCaptureHook(runtime: RuntimeState): void {
  void runtime;
  const targetWindow = window as typeof window & {
    __auroraAreaRuntimeCapture?: AuroraAreaRuntimeCaptureHook;
  };
  if (targetWindow.__auroraAreaRuntimeCapture) {
    delete targetWindow.__auroraAreaRuntimeCapture;
  }
}

interface PerfSnapshot {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

interface CanvasLoadOverlayState {
  visible: boolean;
  completed: number;
  total: number;
  inFlight: number;
  queued: number;
  source: "areas" | "placeables" | "terrain" | "textures";
  variant: "loading" | "blocked";
  title: string;
  currentLabel: string | null;
}

interface PlaceableModelStatusEventDetailLike {
  status?: string;
  loadPhase?: string;
  loadCompleted?: string | number;
  loadTotal?: string | number;
  url?: string;
}

function updateAxesHelperForScene(
  runtime: RuntimeState,
  sceneData: AreaScene,
  sceneScale: number
): void {
  const transform = resolveAxesHelperTransform(sceneData.width, sceneData.height, sceneScale);
  runtime.axesHelper.position.set(
    transform.positionX,
    transform.positionY,
    transform.positionZ
  );
  runtime.axesHelper.scale.setScalar(transform.scale);
}

function parsePlaceableLoadProgressValue(value: string | number | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseRuntimeDatasetCount(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatCanvasLoadCurrentLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  let candidate = trimmed;
  try {
    const parsed = new URL(trimmed, "http://aurora.local");
    candidate = parsed.pathname.split("/").filter(Boolean).pop() ?? trimmed;
  } catch {
    candidate =
      trimmed.split("?")[0]?.split("#")[0]?.split(/[\\/]/u).filter(Boolean).pop() ??
      trimmed;
  }
  const compact = candidate.trim() || "model";
  if (compact.length <= 48) {
    return compact;
  }
  return `${compact.slice(0, 20)}...${compact.slice(-20)}`;
}

function hasActivePlaceableModelLoadQueue(runtime: RuntimeState): boolean {
  const dataset = runtime.container.dataset;
  return (
    parseRuntimeDatasetCount(dataset.placeableModelLoadQueueActiveCount) +
      parseRuntimeDatasetCount(dataset.placeableModelLoadQueuePendingCount) >
    0
  );
}

function isCreaturePreviewCoreRenderable(runtime: RuntimeState): boolean {
  const dataset = runtime.container.dataset;
  const visibleMeshCount = parseRuntimeDatasetCount(
    dataset.creaturePartModelRuntimeVisibleMeshCount
  );
  const mixerCount = parseRuntimeDatasetCount(dataset.creatureAnimationMixerCount);
  const playbackStatuses = String(
    dataset.creatureAnimationMixerPlaybackStatuses ??
      dataset.creatureAnimationRuntimePlaybackStatuses ??
      ""
  )
    .split("|")
    .map((status) => status.trim())
    .filter(Boolean);
  return (
    dataset.placeableModelStatus === "loaded" &&
    visibleMeshCount > 0 &&
    mixerCount > 0 &&
    playbackStatuses.some((status) => status === "playing" || status === "runtime-effects")
  );
}

function createHiddenAssetLoadOverlayState(): CanvasLoadOverlayState {
  return {
    visible: false,
    completed: 0,
    total: 0,
    inFlight: 0,
    queued: 0,
    source: "placeables",
    variant: "loading",
    title: "",
    currentLabel: null
  };
}

export function resolveTerrainTileModelOverlayState(
  snapshot: AreaTerrainTileModelRuntimeSnapshot
): CanvasLoadOverlayState {
  const total = Math.max(
    0,
    snapshot.contractTileCount +
      (snapshot.materialTextureContractTileCount ?? 0) +
      (snapshot.supplementalSurfaceContractCount ?? 0)
  );
  const completed = Math.max(
    0,
    snapshot.loadedTileCount +
      snapshot.failedTileCount +
      (snapshot.materialTextureAppliedTileCount ?? 0) +
      (snapshot.materialTextureFailedTileCount ?? 0) +
      (snapshot.supplementalSurfaceLoadedCount ?? 0) +
      (snapshot.supplementalSurfaceFailedCount ?? 0)
  );
  const pendingCount = Math.max(
    0,
    (snapshot.pendingTileCount ?? 0) +
      (snapshot.materialTexturePendingTileCount ?? 0) +
      (snapshot.supplementalSurfacePendingCount ?? 0)
  );
  if (pendingCount > 0) {
    return {
      visible: true,
      completed,
      total: Math.max(1, total),
      inFlight: pendingCount,
      queued: 0,
      source: "terrain",
      variant: "loading",
      title: "Modele i materiały kafli Areas",
      currentLabel: null
    };
  }
  if (
    (snapshot.status !== undefined && snapshot.status !== "ready") ||
    snapshot.failedTileCount > 0 ||
    snapshot.bridgeTileCount > 0 ||
    (snapshot.materialTextureFailedTileCount ?? 0) > 0 ||
    (snapshot.supplementalSurfaceFailedCount ?? 0) > 0
  ) {
    const unavailableModelSample = (snapshot.blockedTileSample ?? "")
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean)
      .join(", ");
    const unavailableTextureSample = (snapshot.materialTextureFailedTileSample ?? "")
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean)
      .join(", ");
    return {
      visible: true,
      completed,
      total: Math.max(1, snapshot.tileCount),
      inFlight: 0,
      queued: 0,
      source: "terrain",
      variant: "blocked",
      title: "Niepełny runtime kafli Areas",
      currentLabel:
        unavailableModelSample && unavailableModelSample !== "none"
          ? `Brak modelu w aktywnych źródłach: ${unavailableModelSample}`
          : unavailableTextureSample && unavailableTextureSample !== "none"
            ? `Nie udało się przypiąć materiałów: ${unavailableTextureSample}`
            : snapshot.blockerSummary && snapshot.blockerSummary !== "none"
              ? snapshot.blockerSummary
              : "Runtime kafli nie osiągnął stanu ready"
    };
  }
  return createHiddenAssetLoadOverlayState();
}

export interface AreaPresentedFrameSnapshot {
  sequence: number;
  terrainBuildId: string;
  tileStateDigest: string;
  cameraTerrainBuildId: string;
  cameraTileStateDigest: string;
  cameraCoverageStatus: string;
  presentedAt: string;
  settlementToken: string;
}

export function writeAreaPresentedFrameDataset(
  dataset: DOMStringMap,
  presentedAt = new Date().toISOString()
): AreaPresentedFrameSnapshot {
  const previousSequence = Number(dataset.areaPresentedFrameSequence ?? 0);
  const sequence = Number.isFinite(previousSequence)
    ? Math.max(0, Math.trunc(previousSequence)) + 1
    : 1;
  const terrainBuildId =
    dataset.areaTerrainBuildId ?? "terrain-build-missing";
  const tileStateDigest =
    dataset.areaTerrainTileStateDigest ?? "tile-state-digest-missing";
  const cameraTerrainBuildId =
    dataset.areaCameraFrameTerrainBuildId ?? "terrain-build-missing";
  const cameraTileStateDigest =
    dataset.areaCameraFrameTileStateDigest ?? "tile-state-digest-missing";
  const cameraCoverageStatus =
    dataset.areaCameraFrameCoverageStatus ?? "missing";
  const settlementToken = [
    "area-presented-frame/v1",
    sequence,
    terrainBuildId,
    tileStateDigest,
    cameraTerrainBuildId,
    cameraTileStateDigest,
    cameraCoverageStatus
  ].join("|");
  const snapshot: AreaPresentedFrameSnapshot = {
    sequence,
    terrainBuildId,
    tileStateDigest,
    cameraTerrainBuildId,
    cameraTileStateDigest,
    cameraCoverageStatus,
    presentedAt,
    settlementToken
  };
  dataset.areaPresentedFrameSequence = String(sequence);
  dataset.areaPresentedFrameTerrainBuildId = terrainBuildId;
  dataset.areaPresentedFrameTileStateDigest = tileStateDigest;
  dataset.areaPresentedFrameCameraTerrainBuildId = cameraTerrainBuildId;
  dataset.areaPresentedFrameCameraTileStateDigest = cameraTileStateDigest;
  dataset.areaPresentedFrameCameraCoverageStatus = cameraCoverageStatus;
  dataset.areaPresentedFramePresentedAt = presentedAt;
  dataset.areaPresentedFrameSettlementToken = settlementToken;
  return snapshot;
}

export function formatTerrainTileModelRuntimeStatus(
  snapshot: AreaTerrainTileModelRuntimeSnapshot | null
): string {
  if (!snapshot) {
    return "not observed";
  }
  const modelStatus = `${snapshot.loadedTileCount}/${snapshot.tileCount}`;
  const textureStatus =
    `${snapshot.materialTextureAppliedTileCount}/` +
    `${snapshot.materialTextureContractTileCount}`;
  const summary =
    `${snapshot.status} / models ${modelStatus} / textures ${textureStatus}` +
    ` / maps ${snapshot.materialMapCount}`;
  const surfaceSummary =
    (snapshot.supplementalSurfaceContractCount ?? 0) > 0
      ? ` / surfaces ${snapshot.supplementalSurfaceLoadedCount}/` +
        `${snapshot.supplementalSurfaceContractCount}`
      : "";
  return snapshot.blockerSummary && snapshot.blockerSummary !== "none"
    ? `${summary}${surfaceSummary} / blockers ${snapshot.blockerSummary}`
    : `${summary}${surfaceSummary}`;
}

function isAreaSharedRendererModelLoadComplete(
  snapshot: AreaSharedRendererRuntimeSnapshot | null | undefined
): boolean {
  if (!snapshot || snapshot.version !== "aurora-areas-shared-renderer-runtime/v1") {
    return false;
  }
  return (
    snapshot.total > 0 &&
    snapshot.status === "ready" &&
    snapshot.primitiveFallbackCount === 0 &&
    snapshot.blockedIds.length === 0
  );
}

function readAreaSharedRendererRuntimeSnapshot(
  runtime: RuntimeState
): AreaSharedRendererRuntimeSnapshot | null {
  const rawSnapshot = runtime.container.dataset.areaObjectSharedRendererSnapshot;
  if (!rawSnapshot) {
    return null;
  }
  try {
    return JSON.parse(rawSnapshot) as AreaSharedRendererRuntimeSnapshot;
  } catch {
    return null;
  }
}

function isRuntimeAreaSharedRendererModelLoadComplete(runtime: RuntimeState): boolean {
  return isAreaSharedRendererModelLoadComplete(
    readAreaSharedRendererRuntimeSnapshot(runtime)
  );
}

function isPlaceableModelOverlayLoadPhase(loadPhase: string | undefined): boolean {
  if (!loadPhase || loadPhase.trim().length === 0) {
    return true;
  }
  const normalizedLoadPhase = loadPhase.trim().toLowerCase();
  return normalizedLoadPhase === "model" || normalizedLoadPhase === "vfx-chunk-model";
}

function resolveExternalAreaLoadOverlayState(
  areaCanvasLoading: WorkspaceAreaCanvasLoadingState | null | undefined
): CanvasLoadOverlayState {
  if (!areaCanvasLoading) {
    return createHiddenAssetLoadOverlayState();
  }
  const total =
    typeof areaCanvasLoading.total === "number" && Number.isFinite(areaCanvasLoading.total)
      ? Math.max(0, Math.round(areaCanvasLoading.total))
      : 0;
  const completed =
    typeof areaCanvasLoading.completed === "number" &&
    Number.isFinite(areaCanvasLoading.completed)
      ? Math.max(0, Math.min(total, Math.round(areaCanvasLoading.completed)))
      : 0;
  const remaining = Math.max(0, total - completed);
  const requestedInFlight =
    typeof areaCanvasLoading.inFlight === "number" &&
    Number.isFinite(areaCanvasLoading.inFlight)
      ? Math.max(0, Math.round(areaCanvasLoading.inFlight))
      : null;
  const inFlight =
    requestedInFlight !== null
      ? Math.min(remaining, requestedInFlight)
      : remaining > 0
        ? 1
        : 0;
  const requestedQueued =
    typeof areaCanvasLoading.queued === "number" && Number.isFinite(areaCanvasLoading.queued)
      ? Math.max(0, Math.round(areaCanvasLoading.queued))
      : null;
  const queued =
    requestedQueued !== null
      ? Math.min(Math.max(0, remaining - inFlight), requestedQueued)
      : Math.max(0, remaining - inFlight);
  if (total > 0 && remaining === 0 && inFlight === 0 && queued === 0) {
    return createHiddenAssetLoadOverlayState();
  }
  return {
    visible: true,
    completed,
    total,
    inFlight,
    queued,
    source: areaCanvasLoading.source,
    variant: "loading",
    title: areaCanvasLoading.label,
    currentLabel: formatCanvasLoadCurrentLabel(areaCanvasLoading.currentLabel)
  };
}

function resolveCanvasLoadOverlay(
  runtimeOverlay: CanvasLoadOverlayState,
  areaOverlay: CanvasLoadOverlayState
): CanvasLoadOverlayState {
  if (runtimeOverlay.visible && runtimeOverlay.variant === "loading") {
    return runtimeOverlay;
  }
  if (areaOverlay.visible) {
    return areaOverlay;
  }
  return runtimeOverlay;
}

export function formatCanvasLoadOverlayProgress(overlay: CanvasLoadOverlayState): string {
  if (overlay.total > 0) {
    return `Completed ${overlay.completed} / ${overlay.total} / In flight ${overlay.inFlight} / Queued ${overlay.queued}`;
  }
  return "Progress not reported";
}

export function WorkspaceCanvasViewport({
  toolbarState,
  userId,
  sceneViewportPort,
  clientAssetCachePort,
  areaLifecycleFacade,
  areaDraftSessionRegistry,
  onAreaDraftPersisted,
  onAreaWorkspaceStatusChange,
  viewportFacade = defaultViewportFacade,
  trackTelemetryEvent = defaultTrackTelemetryEvent,
  commandSignal,
  sidebarSelectSignal,
  sidebarContextMenuSignal,
  sidebarPropertiesSignal,
  canvasCreateObjectSignal,
  catalogScope,
  workspaceOptions,
  leftPanelWidthPx,
  rightPanelWidthPx,
  viewportFullscreen = false,
  onSceneObjectsSnapshotChange,
  onSelectionSnapshotChange,
  onObjectAddPlacementModeChange,
  externalSceneSeed,
  areaEditorMutationSignal,
  onAreaEditorMutationApplied,
  areaEditingTool = { kind: "inspect" },
  tileProductionCertification,
  onAreaSceneDraftChange,
  onSelectedTileChange,
  renderObjectIds,
  areaCanvasLoading,
  areaTileProcessReadiness,
  placeableRenderPayloadByObjectId,
  creatureRenderPayloadByObjectId,
  creatureResourceOptions,
  creatureAppearanceCatalogFacade,
  creatureGenderCatalogFacade,
  creatureAppendageCatalogFacade,
  creaturePerceptionRangeCatalogFacade,
  creatureWalkRateCatalogFacade,
  creatureSoundSetCatalogFacade,
  creatureStartingPackageCatalogFacade,
  creatureClassCatalogFacade,
  creatureSkillCatalogFacade,
  creatureFeatCatalogFacade,
  creatureSpecialAbilityCatalogFacade,
  creaturePhenotypeCatalogFacade,
  creatureAppearanceAccessToken = null,
  creatureTemplateOptions = [],
  itemTemplateOptions = [],
  soundTemplateOptions = [],
  placeableAssetAccessToken = null,
  placeableApiPort,
  waypointAppearanceAccessToken = null,
  waypointApiPort,
  onPlaceableAssetCacheMiss,
  onItemPreviewObjectNeeded,
  onItemPropertiesApplied,
  onCreaturePropertiesApplied,
  showGizmoModeBadge = true
}: WorkspaceCanvasViewportProps) {
  const encounterCreatureBlueprintOptions = useMemo(() => {
    const byIdentity = new Map<
      string,
      SceneObjectEncounterCreatureListBlueprintTargetEntry
    >();
    for (const object of creatureTemplateOptions) {
      const entry = readEncounterCreatureBlueprintTargetEntry(object);
      if (!entry) continue;
      const key = `${entry.templateId}|${entry.sourceSha256}|${entry.sourceObjectKey}`;
      if (!byIdentity.has(key)) byIdentity.set(key, entry);
    }
    return Object.freeze(Array.from(byIdentity.values()).sort((left, right) =>
      left.resRef.localeCompare(right.resRef)
      || left.templateId.localeCompare(right.templateId)));
  }, [creatureTemplateOptions]);
  const itemInventoryBlueprintOptions = useMemo(
    () => listExistingItemInventoryBlueprintOptions(itemTemplateOptions),
    [itemTemplateOptions],
  );
  const soundCatalogResRefs = useMemo(
    () => Array.from(new Set(
      soundTemplateOptions
        .filter((object) => object.kind === "sounds" && isAreaSoundResRef(object.resRef))
        .map((object) => object.resRef),
    )).sort((left, right) => left.localeCompare(right)),
    [soundTemplateOptions],
  );
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<RuntimeState | null>(null);
  const sceneRef = useRef<AreaScene | null>(null);
  const observedExternalSceneSeedRef = useRef<AreaScene | null | undefined>(externalSceneSeed);
  const renderAreaGeometryRef = useRef(true);
  const visibleObjectsRef = useRef<SceneObject[]>([]);
  const placeableRenderPayloadByObjectIdRef =
    useRef<Record<string, PlaceableViewportRenderPayload> | null>(null);
  const creatureRenderPayloadByObjectIdRef =
    useRef<Record<string, CreatureViewportRenderPayload> | null>(null);
  const runtimeSoundNowPlayingBadgesRef = useRef<readonly RuntimeSoundNowPlayingBadge[]>([]);
  const showRuntimeSoundNowPlayingRef = useRef(false);
  const toolbarStateRef = useRef(toolbarState);
  const commandRevisionRef = useRef(commandSignal?.revision ?? 0);
  const latestCommandRevisionRef = useRef<number | null>(
    commandSignal?.revision ?? null,
  );
  latestCommandRevisionRef.current = commandSignal?.revision ?? null;
  const sidebarSelectRevisionRef = useRef<number | null>(null);
  const sidebarContextMenuRevisionRef = useRef<number | null>(null);
  const sidebarPropertiesRevisionRef = useRef<number | null>(null);
  const canvasCreateObjectRevisionRef = useRef<number | null>(null);
  const nextObjectSequenceRef = useRef(1);
  const clipboardObjectsRef = useRef<SceneObject[]>([]);
  const contextMenuRef = useRef<HTMLElement | null>(null);
  const adjustLocationDialogRef = useRef<HTMLElement | null>(null);
  const adjustLocationDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const areaObjectPolygonDialogRef = useRef<HTMLElement | null>(null);
  const areaObjectPolygonDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const storePropertiesDialogRef = useRef<HTMLElement | null>(null);
  const storePropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const waypointPropertiesDialogRef = useRef<HTMLElement | null>(null);
  const waypointPropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const placeablePropertiesDialogRef = useRef<HTMLElement | null>(null);
  const placeablePropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const soundPropertiesDialogRef = useRef<HTMLElement | null>(null);
  const soundPropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const placeableAssetAccessTokenRef = useRef<string | null>(null);
  const onPlaceableAssetCacheMissRef = useRef(onPlaceableAssetCacheMiss);
  const doorPropertiesDialogRef = useRef<HTMLElement | null>(null);
  const doorPropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const creaturePropertiesDialogRef = useRef<HTMLElement | null>(null);
  const creaturePropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const itemPropertiesDialogRef = useRef<HTMLElement | null>(null);
  const itemPropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const lastPointerWorldRef = useRef<{ x: number; y: number } | null>(null);
  const bookmark1Ref = useRef<ThreeCameraBookmark | null>(null);
  const perfFrameRef = useRef({
    frameCount: 0,
    lastAnimationAt: 0,
    lastTick: 0,
    lastRenderAt: 0
  });
  const isCanvasAssetLoadingRef = useRef(false);
  const runtimeObjectPreviewFrameAppliedRef = useRef(false);
  const perfHudEnabledRef = useRef(false);
  const areaObjectDiagnosticsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sceneHistory, setSceneHistory] = useState<SceneHistoryState>(() =>
    externalSceneSeed
      ? sceneViewportPort.createHistoryFromScene(externalSceneSeed)
      : sceneViewportPort.createInitialHistory(userId)
  );
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const selectedObjectIdsRef = useRef<string[]>([]);
  const [tileSelection, setTileSelection] = useState<{ anchorId: string | null; ids: string[] }>({
    anchorId: null,
    ids: []
  });
  const selectedTileId = tileSelection.anchorId;
  const selectedTileIds = tileSelection.ids;
  const setSelectedTileId = useCallback((value: SetStateAction<string | null>) => {
    setTileSelection((current) => {
      const next = typeof value === "function" ? value(current.anchorId) : value;
      return { anchorId: next, ids: next ? [next] : [] };
    });
  }, []);
  const setSelectedTileIds = useCallback((value: SetStateAction<string[]>) => {
    setTileSelection((current) => {
      const requested = typeof value === "function" ? value(current.ids) : value;
      const ids = [...new Set(requested)];
      const anchorId = ids.at(-1) ?? null;
      return current.anchorId === anchorId &&
        current.ids.length === ids.length &&
        current.ids.every((id, index) => id === ids[index])
        ? current
        : { anchorId, ids };
    });
  }, []);
  const [areaPlacementFeedback, setAreaPlacementFeedback] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const terrainBrush: TerrainBrushKind = "corridor";
  const [objectBrush, setObjectBrush] = useState<SceneObjectKind>("placeables");
  const [lastSavedAtUnixMs, setLastSavedAtUnixMs] = useState<number | null>(null);
  const [areaWorkspaceDraftStatus, setAreaWorkspaceDraftStatus] =
    useState<AreaWorkspaceDraftStatusEvent>(() => ({
      schemaVersion: "area-workspace-status.v1",
      lane: "draft",
      state: "dirty",
      sceneId: sceneHistory.present.sceneId,
      sceneUpdatedAtUnixMs: sceneHistory.present.updatedAtUnixMs,
      commandRevision: 0,
      occurredAtUnixMs: Date.now(),
      browserRecoveryAvailable: false
    }));
  const [webglReady, setWebglReady] = useState(false);
  const [webglFallbackReason, setWebglFallbackReason] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBoxState>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [adjustLocationDialog, setAdjustLocationDialog] =
    useState<AdjustLocationDialogState | null>(null);
  const [areaObjectPolygonDialog, setAreaObjectPolygonDialog] =
    useState<AreaObjectPolygonDialogState | null>(null);
  const [storePropertiesDialog, setStorePropertiesDialog] =
    useState<StorePropertiesDialogState | null>(null);
  const [waypointPropertiesDialog, setWaypointPropertiesDialog] =
    useState<WaypointPropertiesDialogState | null>(null);
  const [waypointAppearanceCatalogState, setWaypointAppearanceCatalogState] =
    useState<WorkspaceWaypointAppearanceCatalogState | null>(null);
  const waypointAppearanceCatalogRequestRevisionRef = useRef(0);
  const [placeablePropertiesDialog, setPlaceablePropertiesDialog] =
    useState<PlaceablePropertiesDialogState | null>(null);
  const [placeableAppearanceCatalogState, setPlaceableAppearanceCatalogState] =
    useState<WorkspacePlaceableAppearanceCatalogState | null>(null);
  const placeableAppearanceCatalogRequestRevisionRef = useRef(0);
  const [soundPropertiesDialog, setSoundPropertiesDialog] =
    useState<SoundPropertiesDialogState | null>(null);
  const [doorPropertiesDialog, setDoorPropertiesDialog] =
    useState<DoorPropertiesDialogState | null>(null);
  const [creaturePropertiesDialog, setCreaturePropertiesDialog] =
    useState<CreaturePropertiesDialogState | null>(null);
  const [creatureAppearanceCatalogState, setCreatureAppearanceCatalogState] =
    useState<WorkspaceCreatureAppearanceCatalogState | null>(null);
  const creatureAppearanceCatalogRequestRevisionRef = useRef(0);
  const [creatureGenderCatalogState, setCreatureGenderCatalogState] =
    useState<WorkspaceCreatureGenderCatalogState | null>(null);
  const creatureGenderCatalogRequestRevisionRef = useRef(0);
  const [creatureWingsCatalogState, setCreatureWingsCatalogState] =
    useState<WorkspaceCreatureAppendageCatalogState | null>(null);
  const creatureWingsCatalogRequestRevisionRef = useRef(0);
  const [creatureTailCatalogState, setCreatureTailCatalogState] =
    useState<WorkspaceCreatureAppendageCatalogState | null>(null);
  const creatureTailCatalogRequestRevisionRef = useRef(0);
  const [creaturePerceptionRangeCatalogState, setCreaturePerceptionRangeCatalogState] =
    useState<WorkspaceCreaturePerceptionRangeCatalogState | null>(null);
  const creaturePerceptionRangeCatalogRequestRevisionRef = useRef(0);
  const [creatureWalkRateCatalogState, setCreatureWalkRateCatalogState] =
    useState<WorkspaceCreatureWalkRateCatalogState | null>(null);
  const creatureWalkRateCatalogRequestRevisionRef = useRef(0);
  const [creatureSoundSetCatalogState, setCreatureSoundSetCatalogState] =
    useState<WorkspaceCreatureSoundSetCatalogState | null>(null);
  const creatureSoundSetCatalogRequestRevisionRef = useRef(0);
  const [creatureStartingPackageCatalogState, setCreatureStartingPackageCatalogState] =
    useState<WorkspaceCreatureStartingPackageCatalogState | null>(null);
  const creatureStartingPackageCatalogRequestRevisionRef = useRef(0);
  const [creatureClassCatalogState, setCreatureClassCatalogState] =
    useState<WorkspaceCreatureClassCatalogState | null>(null);
  const creatureClassCatalogRequestRevisionRef = useRef(0);
  const [creatureSkillCatalogState, setCreatureSkillCatalogState] =
    useState<WorkspaceCreatureSkillCatalogState | null>(null);
  const creatureSkillCatalogRequestRevisionRef = useRef(0);
  const [creatureFeatCatalogState, setCreatureFeatCatalogState] =
    useState<WorkspaceCreatureFeatCatalogState | null>(null);
  const creatureFeatCatalogRequestRevisionRef = useRef(0);
  const [creatureSpecialAbilityCatalogState, setCreatureSpecialAbilityCatalogState] =
    useState<WorkspaceCreatureSpecialAbilityCatalogState | null>(null);
  const creatureSpecialAbilityCatalogRequestRevisionRef = useRef(0);
  const [creaturePhenotypeCatalogState, setCreaturePhenotypeCatalogState] =
    useState<WorkspaceCreaturePhenotypeCatalogState | null>(null);
  const creaturePhenotypeCatalogRequestRevisionRef = useRef(0);
  const [itemPropertiesDialog, setItemPropertiesDialog] =
    useState<ItemPropertiesDialogState | null>(null);
  const [creatureFeatsFilter, setCreatureFeatsFilter] = useState<string>(
    CREATURE_FEAT_FILTER_OPTIONS[0]!
  );
  const [creatureSpellsLevelFilter, setCreatureSpellsLevelFilter] = useState<string>(
    CREATURE_SPELL_LEVEL_FILTER_OPTIONS[0]!
  );
  const [creatureSpellsMetaMagicFilter, setCreatureSpellsMetaMagicFilter] = useState<string>(
    CREATURE_METAMAGIC_FILTER_OPTIONS[0]!
  );
  const [creatureSpellsClassFilterIndex, setCreatureSpellsClassFilterIndex] = useState<number>(0);
  const [creatureSpecialAbilitiesFilter, setCreatureSpecialAbilitiesFilter] = useState<string>(
    CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS[0]!
  );
  const [runtimePopupPinned, setRuntimePopupPinned] = useState(false);
  const [perfSnapshot, setPerfSnapshot] = useState<PerfSnapshot>({
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0
  });
  const [placeableLoadOverlay, setPlaceableLoadOverlay] = useState<CanvasLoadOverlayState>(
    createHiddenAssetLoadOverlayState
  );
  const [terrainTileModelRuntimeSnapshot, setTerrainTileModelRuntimeSnapshot] =
    useState<AreaTerrainTileModelRuntimeSnapshot | null>(null);
  const [areaSharedRendererModelLoadComplete, setAreaSharedRendererModelLoadComplete] =
    useState(false);
  const trackTelemetry = trackTelemetryEvent;
  const scene = sceneHistory.present;
  useEffect(() => {
    const dirtyEvent: AreaWorkspaceDraftStatusEvent = {
      schemaVersion: "area-workspace-status.v1",
      lane: "draft",
      state: "dirty",
      sceneId: scene.sceneId,
      sceneUpdatedAtUnixMs: scene.updatedAtUnixMs,
      commandRevision: commandRevisionRef.current,
      occurredAtUnixMs: Date.now(),
      browserRecoveryAvailable: false,
    };
    setAreaWorkspaceDraftStatus((current) =>
      current.sceneId === scene.sceneId &&
      current.sceneUpdatedAtUnixMs === scene.updatedAtUnixMs
        ? current
        : dirtyEvent
    );
    setLastSavedAtUnixMs(null);
    onAreaWorkspaceStatusChange?.(dirtyEvent);
  }, [onAreaWorkspaceStatusChange, scene.sceneId, scene.updatedAtUnixMs]);
  selectedObjectIdsRef.current = selectedObjectIds;
  placeableRenderPayloadByObjectIdRef.current = placeableRenderPayloadByObjectId ?? null;
  onPlaceableAssetCacheMissRef.current = onPlaceableAssetCacheMiss;
  creatureRenderPayloadByObjectIdRef.current = creatureRenderPayloadByObjectId ?? null;
  showRuntimeSoundNowPlayingRef.current = workspaceOptions.showRuntimeSoundNowPlaying;
  useEffect(() => {
    setAreaSharedRendererModelLoadComplete(false);
    setTerrainTileModelRuntimeSnapshot(null);
  }, [scene.sceneId]);
  const areaLoadOverlay = useMemo(
    () => resolveExternalAreaLoadOverlayState(areaCanvasLoading),
    [areaCanvasLoading]
  );
  const effectivePlaceableLoadOverlay = useMemo(
    () =>
      areaSharedRendererModelLoadComplete && placeableLoadOverlay.source === "placeables"
        ? createHiddenAssetLoadOverlayState()
        : placeableLoadOverlay,
    [areaSharedRendererModelLoadComplete, placeableLoadOverlay]
  );
  const canvasLoadOverlay = useMemo(
    () => resolveCanvasLoadOverlay(effectivePlaceableLoadOverlay, areaLoadOverlay),
    [areaLoadOverlay, effectivePlaceableLoadOverlay]
  );
  const isCanvasAssetLoading =
    effectivePlaceableLoadOverlay.visible ||
    (areaLoadOverlay.visible && areaLoadOverlay.variant === "loading");
  useEffect(() => {
    isCanvasAssetLoadingRef.current = isCanvasAssetLoading;
  }, [isCanvasAssetLoading]);
  useEffect(() => {
    perfHudEnabledRef.current = toolbarState.canvasDebug.perfHud;
  }, [toolbarState.canvasDebug.perfHud]);
  const adjustLocationUnitsPerTile = Math.max(1, viewportFacade.defaultMasterCellsPerTile);
  const renderObjectIdsSet = useMemo(
    () => resolveRenderObjectIdsSet(renderObjectIds),
    [renderObjectIds]
  );
  const {
    runtimeSoundNowPlayingBadges,
    playSelectedSoundPreview,
    stopSoundPreviewPlayback
  } = useRuntimeSoundPreview({
    runtimeRef,
    soundListenerRuntimePort: workspaceThreeSoundListenerRuntimePort,
    soundPropertiesDialog,
    sceneObjects: scene.objects,
    toolbarState,
    renderObjectIdsSet,
    unitsPerTile: adjustLocationUnitsPerTile,
    enableRuntimeSoundPreview: workspaceOptions.enableRuntimeSoundPreview
  });
  runtimeSoundNowPlayingBadgesRef.current = runtimeSoundNowPlayingBadges;
  const {
    objectAddPlacementMode,
    objectAddDropFeedback,
    beginObjectAddPlacement,
    cancelObjectAddPlacement,
    placeObjectAddAtSceneCenter,
    handleCanvasDragOver,
    handleCanvasDragLeave,
    handleCanvasDrop,
    handleCanvasObjectAddMouseDown,
    handleCanvasObjectAddMouseMove,
    handleCanvasObjectAddMouseLeave
  } = useWorkspaceObjectAddDragDrop({
    runtimeRef,
    objectAddRuntimePort: workspaceThreeObjectAddRuntimePort,
    scene,
    sceneViewportPort,
    renderObjectIds,
    toolbarState,
    workspaceOptions,
    nextObjectSequenceRef,
    setSceneHistory,
    setSelectedObjectIds,
    setSelectedTileId,
    trackTelemetry,
    userId
  });

  useEffect(() => {
    onObjectAddPlacementModeChange?.(
      objectAddPlacementMode
        ? {
            templateId: objectAddPlacementMode.template.id,
            objectKind: objectAddPlacementMode.template.kind,
            tag: objectAddPlacementMode.template.tag
          }
        : null
    );
  }, [objectAddPlacementMode, onObjectAddPlacementModeChange]);

  useEffect(() => {
    onSceneObjectsSnapshotChange?.(scene.objects);
  }, [onSceneObjectsSnapshotChange, scene.objects]);

  useEffect(() => {
    if (!sidebarSelectSignal) {
      return;
    }
    if (sidebarSelectRevisionRef.current === sidebarSelectSignal.revision) {
      return;
    }

    const renderObjectIdsSet = resolveRenderObjectIdsSet(renderObjectIds);
    const selectedObject = resolveVisibleObjectForSidebarSignal({
      objects: scene.objects,
      objectId: sidebarSelectSignal.objectId,
      toolbarState,
      renderObjectIdsSet
    });
    if (!selectedObject) {
      return;
    }
    sidebarSelectRevisionRef.current = sidebarSelectSignal.revision;

    setSelectedTileId(null);
    setSelectedObjectIds((current) =>
      resolveSidebarSelectionIds({
        currentSelectedObjectIds: current,
        selectedObject,
        additive: sidebarSelectSignal.additive,
        allowedObjectIds: sidebarSelectSignal.allowedObjectIds,
        objects: scene.objects,
        toolbarState,
        renderObjectIdsSet
      })
    );
    setContextMenu(null);
    trackTelemetry("scene.selection.from_scene_object_list", {
      userId,
      objectId: selectedObject.id,
      objectKind: selectedObject.kind,
      revision: sidebarSelectSignal.revision,
      additive: sidebarSelectSignal.additive,
      sourceType: sidebarSelectSignal.sourceType
    });
  }, [renderObjectIds, scene.objects, sidebarSelectSignal, toolbarState, userId]);

  useEffect(() => {
    if (!sidebarContextMenuSignal) {
      return;
    }
    if (sidebarContextMenuRevisionRef.current === sidebarContextMenuSignal.revision) {
      return;
    }

    const renderObjectIdsSet = resolveRenderObjectIdsSet(renderObjectIds);
    const selectedObject = resolveVisibleObjectForSidebarSignal({
      objects: scene.objects,
      objectId: sidebarContextMenuSignal.objectId,
      toolbarState,
      renderObjectIdsSet
    });
    if (!selectedObject) {
      return;
    }
    sidebarContextMenuRevisionRef.current = sidebarContextMenuSignal.revision;

    const runtime = runtimeRef.current;
    const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
    const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
    const anchoredPosition = runtime
      ? resolveAnchoredContextMenuPosition(
          runtime,
          selectedObject,
          selectedObject.id,
          anchorOffsetX,
          anchorOffsetY
        )
      : { x: 24, y: 24 };

    setSelectedTileId(null);
    setSelectedObjectIds((current) =>
      current.includes(selectedObject.id) ? current : [selectedObject.id]
    );
    setContextMenu({
      x: anchoredPosition.x,
      y: anchoredPosition.y,
      objectId: selectedObject.id,
      objectKind: selectedObject.kind,
      anchorOffsetX,
      anchorOffsetY
    });
    trackTelemetry("scene.context_menu.open_from_scene_object_list", {
      userId,
      objectId: selectedObject.id,
      objectKind: selectedObject.kind,
      revision: sidebarContextMenuSignal.revision
    });
  }, [renderObjectIds, scene.objects, sidebarContextMenuSignal, toolbarState, userId]);

  const renderAreaGeometry = useMemo(
    () => shouldRenderAreaGeometry(renderObjectIds),
    [renderObjectIds]
  );
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    // A same-scene external update (for example enabling Aurora tile editing)
    // must reach the viewport before its older internal scene is echoed back to
    // WorkspaceLayout. Otherwise the stale draft immediately strips the newly
    // hydrated auroraAreaEditing payload.
    if (
      !shouldPublishWorkspaceAreaSceneDraft(
        externalSceneSeed,
        observedExternalSceneSeedRef.current,
        scene
      )
    ) {
      return;
    }
    onAreaSceneDraftChange?.(scene);
  }, [externalSceneSeed, onAreaSceneDraftChange, scene]);
  useEffect(() => {
    onSelectedTileChange?.(selectedTileId, selectedTileIds);
  }, [onSelectedTileChange, selectedTileId, selectedTileIds]);
  useEffect(() => {
    renderAreaGeometryRef.current = renderAreaGeometry;
  }, [renderAreaGeometry]);
  toolbarStateRef.current = toolbarState;
  const sceneGridVisibility = useMemo(
    () =>
      resolveSceneGridVisibility({
        renderObjectIds,
        gridEnabled: toolbarState.canvasDebug.grid,
        tileOverlayEnabled: workspaceOptions.showTileGridOverlay
      }),
    [renderObjectIds, toolbarState.canvasDebug.grid, workspaceOptions.showTileGridOverlay]
  );
  const terrainRenderStatus = useMemo(
    () => resolveTerrainRenderStatus(scene, areaTileProcessReadiness),
    [areaTileProcessReadiness, scene]
  );
  const terrainScenePackageReadiness = useMemo(
    () => resolveTerrainScenePackageReadiness(scene, terrainRenderStatus, areaTileProcessReadiness),
    [areaTileProcessReadiness, scene, terrainRenderStatus]
  );
  const objectRenderFilterState = useMemo(
    () => ({
      visibility: toolbarState.visibility,
      isolateKind: toolbarState.canvasDebug.isolateKind
    }),
    [
      toolbarState.visibility.creatures,
      toolbarState.visibility.doors,
      toolbarState.visibility.encounters,
      toolbarState.visibility.items,
      toolbarState.visibility.placeables,
      toolbarState.visibility.sounds,
      toolbarState.visibility.stores,
      toolbarState.visibility.triggers,
      toolbarState.visibility.waypoints,
      toolbarState.canvasDebug.isolateKind
    ]
  );

  const visibleObjects = useMemo(
    () =>
      scene.objects.filter(
        (object) =>
          isObjectVisibleWithRenderFilterState(
            object,
            objectRenderFilterState,
            renderObjectIdsSet
          )
      ),
    [objectRenderFilterState, renderObjectIdsSet, scene.objects]
  );
  visibleObjectsRef.current = visibleObjects;
  const areaObjectSharedRendererDiagnostics = useMemo(
    () =>
      resolveAreaObjectBackendRenderContractDiagnostics(
        visibleObjects,
        placeableRenderPayloadByObjectId ?? null
      ),
    [placeableRenderPayloadByObjectId, visibleObjects]
  );
  const hasAreaPayloadRequestsInFlight =
    isCanvasAssetLoading &&
    areaObjectSharedRendererDiagnostics.total > 0 &&
    areaObjectSharedRendererDiagnostics.payloadReadyCount <
      areaObjectSharedRendererDiagnostics.total;

  const objectById = useMemo(
    () => new Map(scene.objects.map((object) => [object.id, object])),
    [scene.objects]
  );

  const catalogAllowedIdsSet = useMemo(
    () => new Set(catalogScope?.allowedObjectIds ?? scene.objects.map((object) => object.id)),
    [catalogScope?.allowedObjectIds, scene.objects]
  );

  const isSelectableByActiveFilters = useCallback(
    (object: SceneObject) =>
      isObjectSelectableByScope(object, toolbarState.selectionScope) &&
      isObjectSelectableByCatalogScope(object, catalogScope, catalogAllowedIdsSet),
    [catalogAllowedIdsSet, catalogScope, toolbarState.selectionScope]
  );

  const visibleObjectIdsSet = useMemo(
    () => new Set(visibleObjects.map((object) => object.id)),
    [visibleObjects]
  );
  const visibleSelectableSelectedObjectIds = useMemo(
    () =>
      filterSelectedObjectIdsForVisibleSelectableObjects({
        selectedObjectIds,
        objectById,
        visibleObjectIdsSet,
        isSelectableByActiveFilters
      }),
    [isSelectableByActiveFilters, objectById, selectedObjectIds, visibleObjectIdsSet]
  );

  useEffect(() => {
    onSelectionSnapshotChange?.(visibleSelectableSelectedObjectIds);
  }, [onSelectionSnapshotChange, visibleSelectableSelectedObjectIds]);

  const {
    copySelectedObjectsToClipboard,
    cutSelectedObjectsToClipboard,
    deleteSelectedObjects,
    duplicateObjects,
    moveSelectedObjectsByDelta,
    pasteClipboardObjects
  } = useWorkspaceObjectCommands({
    scene,
    visibleObjects,
    sceneViewportPort,
    selectedObjectIds,
    setSelectedObjectIds,
    setSelectedTileId,
    setSceneHistory,
    toolbarState,
    workspaceOptions,
    userId,
    lastPointerWorldRef,
    nextObjectSequenceRef,
    clipboardObjectsRef,
    trackTelemetry
  });

  const {
    hasClipboardTiles,
    clipboardFeedback,
    clearClipboardFeedback,
    copySelectedTilesToClipboard,
    cutSelectedTilesToClipboard,
    deleteSelectedTiles,
    pasteClipboardTiles
  } = useAuroraAreaTileClipboardCommands({
    scene,
    selectedTileId,
    selectedTileIds,
    sceneViewportPort,
    tileProductionCertification,
    setSceneHistory,
    setSelectedObjectIds,
    setSelectedTileId,
    setSelectedTileIds,
    userId,
    trackTelemetry
  });
  const copyWorkspaceSelectionToClipboard = useCallback(
    (source: string) =>
      copySelectedTilesToClipboard(source)
        ? []
        : copySelectedObjectsToClipboard(source),
    [copySelectedObjectsToClipboard, copySelectedTilesToClipboard]
  );
  const cutWorkspaceSelectionToClipboard = useCallback(
    (source: string) =>
      cutSelectedTilesToClipboard(source)
        ? 1
        : cutSelectedObjectsToClipboard(source),
    [cutSelectedObjectsToClipboard, cutSelectedTilesToClipboard]
  );
  const pasteWorkspaceClipboard = useCallback(
    (source: string) =>
      pasteClipboardTiles(source) ? [] : pasteClipboardObjects(source),
    [pasteClipboardObjects, pasteClipboardTiles]
  );
  const deleteWorkspaceSelection = useCallback(
    (source: string) =>
      deleteSelectedTiles(source) ? 1 : deleteSelectedObjects(source),
    [deleteSelectedObjects, deleteSelectedTiles]
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let runtime: RuntimeState;
    try {
      runtime = createRuntime(host);
    } catch {
      setWebglFallbackReason("WebGL runtime is unavailable in this environment.");
      setWebglReady(false);
      trackTelemetry("scene.webgl.init_failed", { userId });
      return;
    }
    if (clientAssetCachePort) {
      installClientAssetCachedFetch(runtime, {
        cachePort: clientAssetCachePort,
        scopeKey: userId,
        onDiagnostic: (event) => trackTelemetry("scene.asset_cache", { ...event }),
      });
    }
    runtimeRef.current = runtime;
    installAuroraCreatureProofRuntimeHook(runtime);
    installAuroraAreaRuntimeCaptureHook(runtime);
    const initialPlaceableAssetAccessToken = placeableAssetAccessToken?.trim() || null;
    applyPlaceableAssetRequestHeaders(runtime, initialPlaceableAssetAccessToken);
    placeableAssetAccessTokenRef.current = initialPlaceableAssetAccessToken;
    setWebglFallbackReason(null);
    setWebglReady(true);
    let areaSharedRendererRefreshFrameId: number | null = null;
    let areaSharedRendererRefreshTimeoutId: number | null = null;
    let pendingPlaceableModelLoadQueueProgress:
      | PlaceableModelLoadQueueProgressDetail
      | null = null;
    let placeableModelLoadQueueProgressFrameId: number | null = null;
    let placeableModelLoadQueueProgressTimeoutId: number | null = null;
    let lastAreaSharedRendererEvidenceRefreshAt = 0;

    const flushAreaSharedRendererRuntimeSnapshotRefresh = () => {
      areaSharedRendererRefreshFrameId = null;
      areaSharedRendererRefreshTimeoutId = null;
      safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
    };

    const scheduleAreaSharedRendererRuntimeSnapshotRefresh = () => {
      if (
        areaSharedRendererRefreshFrameId !== null ||
        areaSharedRendererRefreshTimeoutId !== null
      ) {
        return;
      }
      if (typeof window.requestAnimationFrame === "function") {
        areaSharedRendererRefreshFrameId = window.requestAnimationFrame(
          flushAreaSharedRendererRuntimeSnapshotRefresh
        );
        return;
      }
      areaSharedRendererRefreshTimeoutId = window.setTimeout(
        flushAreaSharedRendererRuntimeSnapshotRefresh,
        0
      );
    };

    const processPlaceableModelLoadQueueProgress = () => {
      placeableModelLoadQueueProgressFrameId = null;
      placeableModelLoadQueueProgressTimeoutId = null;
      const detail = pendingPlaceableModelLoadQueueProgress;
      pendingPlaceableModelLoadQueueProgress = null;
      if (!detail || detail.loadTotal <= 0) {
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
        return;
      }
      if (isCreaturePreviewCoreRenderable(runtime)) {
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
        return;
      }
      if (detail.status === "loading" && detail.loadCompleted < detail.loadTotal) {
        setPlaceableLoadOverlay({
          visible: true,
          completed: Math.max(0, Math.min(detail.loadTotal, detail.loadCompleted)),
          total: detail.loadTotal,
          inFlight: Math.max(0, detail.activeCount),
          queued: Math.max(0, detail.pendingCount),
          source: "placeables",
          variant: "loading",
          title: "Modele PLC/DOR",
          currentLabel: formatCanvasLoadCurrentLabel(detail.currentLabel)
        });
        return;
      }
      setPlaceableLoadOverlay((current) =>
        current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
      );
    };

    const schedulePlaceableModelLoadQueueProgress = (
      detail: PlaceableModelLoadQueueProgressDetail | null | undefined
    ) => {
      pendingPlaceableModelLoadQueueProgress = detail ?? null;
      if (
        placeableModelLoadQueueProgressFrameId !== null ||
        placeableModelLoadQueueProgressTimeoutId !== null
      ) {
        return;
      }
      if (typeof window.requestAnimationFrame === "function") {
        placeableModelLoadQueueProgressFrameId = window.requestAnimationFrame(
          processPlaceableModelLoadQueueProgress
        );
        return;
      }
      placeableModelLoadQueueProgressTimeoutId = window.setTimeout(
        processPlaceableModelLoadQueueProgress,
        0
      );
    };

    const handlePlaceableModelStatus = (event: Event) => {
      const customEvent = event as CustomEvent<PlaceableModelStatusEventDetailLike>;
      const detail = customEvent.detail ?? {};
      scheduleAreaSharedRendererRuntimeSnapshotRefresh();
      if (!hasActivePlaceableModelLoadQueue(runtime)) {
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
        return;
      }
      if (!isPlaceableModelOverlayLoadPhase(detail.loadPhase)) {
        if (
          isRuntimeAreaSharedRendererModelLoadComplete(runtime) ||
          isCreaturePreviewCoreRenderable(runtime)
        ) {
          setPlaceableLoadOverlay((current) =>
            current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
          );
        }
        return;
      }
      const loadCompletedRaw = parsePlaceableLoadProgressValue(detail.loadCompleted);
      const loadTotalRaw = parsePlaceableLoadProgressValue(detail.loadTotal);
      if (
        loadCompletedRaw !== null &&
        loadTotalRaw !== null &&
        loadTotalRaw > 0 &&
        loadCompletedRaw < loadTotalRaw
      ) {
        const total = Math.max(1, Math.round(loadTotalRaw));
        const completed = Math.max(0, Math.min(total, Math.round(loadCompletedRaw)));
        setPlaceableLoadOverlay({
          visible: true,
          completed,
          total,
          inFlight: total > completed ? 1 : 0,
          queued: Math.max(0, total - completed - 1),
          source: "placeables",
          variant: "loading",
          title: "Modele PLC/DOR",
          currentLabel: formatCanvasLoadCurrentLabel(detail.url)
        });
        return;
      }

      if (
        loadCompletedRaw !== null &&
        loadTotalRaw !== null &&
        loadTotalRaw > 0 &&
        loadCompletedRaw >= loadTotalRaw
      ) {
        if (hasActivePlaceableModelLoadQueue(runtime)) {
          return;
        }
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
      }
    };
    const handlePlaceableModelLoadQueueProgress = (event: Event) => {
      const customEvent = event as CustomEvent<PlaceableModelLoadQueueProgressDetail>;
      scheduleAreaSharedRendererRuntimeSnapshotRefresh();
      schedulePlaceableModelLoadQueueProgress(customEvent.detail);
    };
    const handlePlaceableAssetCacheMiss = (event: Event) => {
      const detail = (event as CustomEvent<PlaceableAssetCacheMissEventDetail>).detail;
      if (!detail) {
        return;
      }
      onPlaceableAssetCacheMissRef.current?.(detail);
    };
    const handleTerrainTileModelRuntimeSnapshot = (event: Event) => {
      const customEvent = event as CustomEvent<AreaTerrainTileModelRuntimeSnapshot>;
      const snapshot = customEvent.detail;
      if (!snapshot) {
        return;
      }
      if (
        snapshot.areaId &&
        sceneRef.current?.sceneId &&
        snapshot.areaId !== sceneRef.current.sceneId
      ) {
        return;
      }
      setTerrainTileModelRuntimeSnapshot(snapshot);
      const nextOverlay = resolveTerrainTileModelOverlayState(snapshot);
      setPlaceableLoadOverlay((current) => {
        if (nextOverlay.visible) {
          return nextOverlay;
        }
        return current.source === "terrain" ? createHiddenAssetLoadOverlayState() : current;
      });
      if (
        snapshot.status === "ready" &&
        snapshot.tileCount > 0 &&
        snapshot.loadedTileCount === snapshot.tileCount &&
        snapshot.failedTileCount === 0
      ) {
        refitTopDownOracleCameraForVisibleTerrain(runtime);
        refitFocusedPerspectiveCameraForVisibleTerrain(runtime);
      }
    };
    const applyOracleCleanCanvasPresentation = (detail?: {
      displayFog?: boolean | null;
      renderPriorityObjectIds?: string[] | string | null;
      source?: string;
      terrainMaterialMode?: string | null;
      terrainVoidMaskModelResRef?: string | null;
      terrainVoidMaskSourceMesh?: string | null;
      terrainVoidMasksVisible?: boolean | null;
      tileLightsVisible?: boolean | null;
      useAreaLighting?: boolean | null;
    }) => {
      runtime.gridLayer.visible = false;
      runtime.tileOverlayLayer.visible = false;
      runtime.axesHelper.visible = false;
      runtime.gizmoLayer.visible = false;
      runtime.boundsLayer.visible = false;
      runtime.transformControls.detach();
      runtime.transformControls.enabled = false;
      runtime.transformControls.getHelper().visible = false;
      setAreaOracleTileLightMarkersVisible(runtime, false);
      if (detail?.tileLightsVisible === false) {
        setAreaOracleTileLightsVisible(runtime, false);
      }
      if (detail?.displayFog === false) {
        setAreaOracleGlobalFogVisible(runtime, false);
      }
      if (detail?.useAreaLighting === false) {
        setAreaOracleAreaLightingVisible(runtime, false);
      }
      if (typeof detail?.terrainVoidMasksVisible === "boolean") {
        setAreaOracleTerrainVoidMasksVisible(
          runtime,
          detail.terrainVoidMasksVisible,
          {
            modelResRef: detail.terrainVoidMaskModelResRef,
            sourceMesh: detail.terrainVoidMaskSourceMesh
          }
        );
      }
      setAreaOracleTerrainMaterialMode(runtime, detail?.terrainMaterialMode);
      const activeScene = sceneRef.current;
      const renderPriorityObjectIds = normalizeAreaOracleRenderPriorityObjectIds(
        detail?.renderPriorityObjectIds
      );
      runtime.container.dataset.areaOracleRenderPriorityObjectIds =
        renderPriorityObjectIds.join("|");
      if (activeScene) {
        const cleanCanvasDebugState = resolveAreaOracleCleanCanvasDebugState(
          toolbarStateRef.current.canvasDebug
        );
        const sceneScale = sceneViewportPort.getSceneScale(activeScene.width, activeScene.height);
        if (renderPriorityObjectIds.length > 0) {
          rebuildObjectMeshes(
            runtime,
            visibleObjectsRef.current,
            renderPriorityObjectIds,
            cleanCanvasDebugState,
            activeScene.width,
            activeScene.height,
            sceneScale,
            renderAreaGeometryRef.current,
            adjustLocationUnitsPerTile,
            runtimeSoundNowPlayingBadgesRef.current,
            showRuntimeSoundNowPlayingRef.current,
            placeableRenderPayloadByObjectIdRef.current,
            creatureRenderPayloadByObjectIdRef.current,
            activeScene.auroraVfxCollision ?? null
          );
          writePlaceableTwoDaLightRenderDiagnostics(runtime);
          writeAuroraScenePointLightDiagnostics(runtime);
          safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
          scheduleAreaSharedRendererRuntimeSnapshotEvidenceRefresh(runtime);
        }
        updateObjectMeshSelectionState(
          runtime,
          visibleObjectsRef.current,
          [],
          cleanCanvasDebugState,
          sceneScale,
          renderAreaGeometryRef.current
        );
      }
      runtime.scene.background = new THREE.Color(0x000000);
      runtime.renderer.setClearColor(0x000000, 1);
      runtime.container.dataset.areaOracleCleanCanvas = "true";
      runtime.container.dataset.areaOracleCleanCanvasSource =
        detail?.source ?? "runtime";
      runtime.container.dataset.areaOracleSelectionVisuals = "hidden";
      runtime.container.dataset.areaOracleEditorLayersVisible = "false";
    };
    const handleOracleTopDownCamera = (event: Event) => {
      const customEvent = event as CustomEvent<{
        cleanCanvas?: boolean;
        displayFog?: boolean | null;
        distance?: number | string;
        renderPriorityObjectIds?: string[] | string | null;
        source?: string;
        targetX?: number | string;
        targetY?: number | string;
        targetZ?: number | string;
        terrainMaterialMode?: string | null;
        terrainVoidMaskModelResRef?: string | null;
        terrainVoidMaskSourceMesh?: string | null;
        terrainVoidMasksVisible?: boolean | null;
        tileLightsVisible?: boolean | null;
        useAreaLighting?: boolean | null;
      }>;
      const activeScene = sceneRef.current;
      if (!activeScene) {
        return;
      }
      const targetX = parsePlaceableLoadProgressValue(customEvent.detail?.targetX);
      const targetY = parsePlaceableLoadProgressValue(customEvent.detail?.targetY);
      const targetZ = parsePlaceableLoadProgressValue(customEvent.detail?.targetZ);
      const distance = parsePlaceableLoadProgressValue(customEvent.detail?.distance);
      setTopDownOracleCameraForScene(runtime, activeScene, {
        objectPreview: !renderAreaGeometryRef.current,
        ...(targetX !== null ? { topDownTargetX: targetX } : {}),
        ...(targetY !== null ? { topDownTargetY: targetY } : {}),
        ...(targetZ !== null ? { topDownTargetZ: targetZ } : {}),
        ...(distance !== null ? { topDownDistance: distance } : {})
      });
      applyTopDownOracleCameraLock(runtime);
      if (customEvent.detail?.cleanCanvas === true) {
        applyOracleCleanCanvasPresentation(customEvent.detail);
      }
      renderRuntime(runtime);
    };
    const handleFocusedPerspectiveCamera = (event: Event) => {
      const customEvent = event as CustomEvent<{
        cleanCanvas?: boolean;
        displayFog?: boolean | null;
        distance?: number | string;
        elevationDegrees?: number | string;
        renderPriorityObjectIds?: string[] | string | null;
        source?: string;
        targetX?: number | string;
        targetY?: number | string;
        targetZ?: number | string;
        terrainMaterialMode?: string | null;
        terrainVoidMaskModelResRef?: string | null;
        terrainVoidMaskSourceMesh?: string | null;
        terrainVoidMasksVisible?: boolean | null;
        tileLightsVisible?: boolean | null;
        useAreaLighting?: boolean | null;
        yawDegrees?: number | string;
      }>;
      const targetX = parsePlaceableLoadProgressValue(customEvent.detail?.targetX);
      const targetY = parsePlaceableLoadProgressValue(customEvent.detail?.targetY) ?? 0.22;
      const targetZ = parsePlaceableLoadProgressValue(customEvent.detail?.targetZ);
      const distance = Math.max(
        0.8,
        parsePlaceableLoadProgressValue(customEvent.detail?.distance) ?? 3.2
      );
      const yawRadians = THREE.MathUtils.degToRad(
        parsePlaceableLoadProgressValue(customEvent.detail?.yawDegrees) ?? 45
      );
      const elevationRadians = THREE.MathUtils.degToRad(
        parsePlaceableLoadProgressValue(customEvent.detail?.elevationDegrees) ?? 52
      );
      if (targetX === null || targetZ === null) {
        return;
      }
      const horizontalDistance = Math.max(0.05, Math.cos(elevationRadians) * distance);
      const target = new THREE.Vector3(targetX, targetY, targetZ);
      runtime.controls.target.copy(target);
      runtime.camera.up.set(0, 1, 0).normalize();
      runtime.camera.position.set(
        target.x + Math.cos(yawRadians) * horizontalDistance,
        target.y + Math.sin(elevationRadians) * distance,
        target.z + Math.sin(yawRadians) * horizontalDistance
      );
      runtime.camera.lookAt(target);
      runtime.camera.near = Math.max(0.05, Math.min(0.25, distance * 0.04));
      runtime.camera.far = Math.max(1000, distance * 48);
      runtime.camera.updateProjectionMatrix();
      runtime.camera.updateMatrixWorld(true);
      runtime.controls.update();
      runtime.container.dataset.areaCameraFrameStatus = "focused-perspective";
      runtime.container.dataset.areaCameraFrameMode = "focused_perspective";
      runtime.container.dataset.areaCameraFrameSource =
        customEvent.detail?.source ?? "runtime";
      runtime.container.dataset.areaCameraFrameTarget = `${target.x.toFixed(3)},${target.y.toFixed(3)},${target.z.toFixed(3)}`;
      runtime.container.dataset.areaCameraFrameDistance = distance.toFixed(3);
      runtime.container.dataset.areaCameraFrameSize = "focused";
      runtime.container.dataset.areaCameraFrameZoomRange =
        `${runtime.controls.minDistance.toFixed(3)}..${runtime.controls.maxDistance.toFixed(3)}`;
      const focusedDirection = new THREE.Vector3();
      runtime.camera.getWorldDirection(focusedDirection);
      runtime.container.dataset.areaCameraFrameFov = runtime.camera.fov.toFixed(3);
      runtime.container.dataset.areaCameraFramePosition = formatAreaRuntimeVectorDataset(
        runtime.camera.position
      );
      runtime.container.dataset.areaCameraFrameActualTarget = formatAreaRuntimeVectorDataset(
        runtime.controls.target
      );
      runtime.container.dataset.areaCameraFrameUp = formatAreaRuntimeVectorDataset(
        runtime.camera.up
      );
      runtime.container.dataset.areaCameraFrameDirection =
        formatAreaRuntimeVectorDataset(focusedDirection);
      runtime.container.dataset.areaCameraFrameActualDistance =
        runtime.camera.position.distanceTo(runtime.controls.target).toFixed(3);
      if (customEvent.detail?.cleanCanvas === true) {
        applyOracleCleanCanvasPresentation(customEvent.detail);
      }
      renderRuntime(runtime);
    };
    const handleOracleRenderVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{
        objectsVisible?: boolean;
        source?: string;
      }>;
      const objectsVisible = customEvent.detail?.objectsVisible !== false;
      runtime.objectLayer.visible = objectsVisible;
      runtime.container.dataset.areaOracleRenderVisibility = objectsVisible ? "all" : "terrain_only";
      runtime.container.dataset.areaOracleObjectLayerVisible = objectsVisible ? "true" : "false";
      runtime.container.dataset.areaOracleRenderVisibilitySource =
        customEvent.detail?.source ?? "runtime";
      applyTopDownOracleCameraLock(runtime);
      renderRuntime(runtime);
    };
    const handleAreaSharedRendererSnapshot = (event: Event) => {
      const customEvent = event as CustomEvent<AreaSharedRendererRuntimeSnapshot>;
      if (!isAreaSharedRendererModelLoadComplete(customEvent.detail)) {
        return;
      }
      setAreaSharedRendererModelLoadComplete(true);
      setPlaceableLoadOverlay((current) =>
        current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
      );
    };
    const handleItemVisualProofRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{ label?: string }>;
      const label = customEvent.detail?.label ?? "";
      runtime.container.dataset.itemVisualProofLastRequestLabel = label;
      runtime.container.dataset.itemVisualProofRequestCount = String(
        parseRuntimeDatasetCount(runtime.container.dataset.itemVisualProofRequestCount) + 1
      );
      delete runtime.container.dataset.itemVisualProofSnapshotError;
      try {
        renderRuntime(runtime);
        buildItemVisualProofSnapshot(
          runtime,
          sceneRef.current,
          visibleObjectsRef.current,
          selectedObjectIdsRef.current,
          {
            label,
            renderAreaGeometry: renderAreaGeometryRef.current
          }
        );
      } catch (error) {
        runtime.container.dataset.itemVisualProofSnapshotError =
          error instanceof Error ? error.message : String(error);
      }
    };
    const handleWheelCapture = (event: globalThis.WheelEvent) => {
      if (
        shouldConsumeCanvasWheelForCamera(runtime, event.deltaY, {
          loading: isCanvasAssetLoadingRef.current
        })
      ) {
        return;
      }
      event.stopImmediatePropagation();
    };
    const wheelCaptureOptions: AddEventListenerOptions = { capture: true, passive: false };
    runtime.container.addEventListener(PLACEABLE_MODEL_STATUS_EVENT, handlePlaceableModelStatus);
    runtime.container.addEventListener(
      PLACEABLE_ASSET_CACHE_MISS_EVENT,
      handlePlaceableAssetCacheMiss
    );
    runtime.container.addEventListener(
      PLACEABLE_MODEL_LOAD_QUEUE_PROGRESS_EVENT,
      handlePlaceableModelLoadQueueProgress
    );
    runtime.container.addEventListener(
      AREA_TERRAIN_TILE_MODEL_RUNTIME_SNAPSHOT_EVENT,
      handleTerrainTileModelRuntimeSnapshot
    );
    runtime.container.addEventListener(
      AREA_FOCUSED_PERSPECTIVE_CAMERA_EVENT,
      handleFocusedPerspectiveCamera
    );
    runtime.container.addEventListener(
      AREA_ORACLE_TOP_DOWN_CAMERA_EVENT,
      handleOracleTopDownCamera
    );
    runtime.container.addEventListener(
      AREA_ORACLE_RENDER_VISIBILITY_EVENT,
      handleOracleRenderVisibility
    );
    runtime.container.addEventListener(
      AREA_SHARED_RENDERER_SNAPSHOT_EVENT,
      handleAreaSharedRendererSnapshot
    );
    runtime.container.addEventListener(
      ITEM_VISUAL_PROOF_REQUEST_EVENT,
      handleItemVisualProofRequest
    );
    runtime.container.dataset.itemVisualProofRequestListener = "ready";
    runtime.renderer.domElement.addEventListener(
      "wheel",
      handleWheelCapture,
      wheelCaptureOptions
    );

    resizeRuntime(runtime);
    centerCameraForScene(runtime, scene, { objectPreview: !renderAreaGeometry });
    runtimeObjectPreviewFrameAppliedRef.current = false;
    perfFrameRef.current = {
      frameCount: 0,
      lastAnimationAt: performance.now(),
      lastTick: performance.now(),
      lastRenderAt: 0
    };

    const animate = () => {
      const now = performance.now();
      const animationDeltaSeconds =
        (now - perfFrameRef.current.lastAnimationAt) / 1000;
      perfFrameRef.current.lastAnimationAt = now;
      updateRuntimeObjectAnimationPlaybacks(runtime, animationDeltaSeconds);
      advanceAuroraWorldTimerRuntime(
        runtime.scene,
        sceneRef.current?.auroraWorldTimer,
        animationDeltaSeconds
      );
      if (renderAreaGeometry && now - lastAreaSharedRendererEvidenceRefreshAt >= 500) {
        lastAreaSharedRendererEvidenceRefreshAt = now;
        safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
      }
      const assetLoading = isCanvasAssetLoadingRef.current;
      if (!assetLoading) {
        if (!renderAreaGeometry && !runtimeObjectPreviewFrameAppliedRef.current) {
          runtimeObjectPreviewFrameAppliedRef.current =
            centerCameraForRuntimeObjectPreview(runtime);
        }
        runtime.controls.update();
      }
      applyTopDownOracleCameraLock(runtime);
      const shouldRenderFrame =
        !assetLoading ||
        now - perfFrameRef.current.lastRenderAt >= ASSET_LOADING_RENDER_INTERVAL_MS;
      if (shouldRenderFrame) {
        renderRuntime(runtime);
        perfFrameRef.current.lastRenderAt = now;
        perfFrameRef.current.frameCount += 1;
      }
      const elapsedMs = now - perfFrameRef.current.lastTick;
      if (elapsedMs >= PERF_SNAPSHOT_INTERVAL_MS) {
        if (perfHudEnabledRef.current) {
          const fps = Math.round((perfFrameRef.current.frameCount * 1000) / elapsedMs);
          setPerfSnapshot({
            fps,
            drawCalls: runtime.renderer.info.render.calls,
            triangles: runtime.renderer.info.render.triangles,
            geometries: runtime.renderer.info.memory.geometries,
            textures: runtime.renderer.info.memory.textures
          });
        }
        perfFrameRef.current.frameCount = 0;
        perfFrameRef.current.lastTick = now;
      }
      runtime.frameId = requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            resizeRuntime(runtime);
          })
        : null;
    resizeObserver?.observe(host);
    runtime.resizeObserver = resizeObserver;

    const onWindowResize = () => resizeRuntime(runtime);
    window.addEventListener("resize", onWindowResize);

    return () => {
      uninstallAuroraCreatureProofRuntimeHook(runtime);
      uninstallAuroraAreaRuntimeCaptureHook(runtime);
      window.removeEventListener("resize", onWindowResize);
      runtime.container.removeEventListener(
        PLACEABLE_MODEL_STATUS_EVENT,
        handlePlaceableModelStatus
      );
      runtime.container.removeEventListener(
        PLACEABLE_ASSET_CACHE_MISS_EVENT,
        handlePlaceableAssetCacheMiss
      );
      runtime.container.removeEventListener(
        PLACEABLE_MODEL_LOAD_QUEUE_PROGRESS_EVENT,
        handlePlaceableModelLoadQueueProgress
      );
      runtime.container.removeEventListener(
        AREA_TERRAIN_TILE_MODEL_RUNTIME_SNAPSHOT_EVENT,
        handleTerrainTileModelRuntimeSnapshot
      );
      runtime.container.removeEventListener(
        AREA_FOCUSED_PERSPECTIVE_CAMERA_EVENT,
        handleFocusedPerspectiveCamera
      );
      runtime.container.removeEventListener(
        AREA_ORACLE_TOP_DOWN_CAMERA_EVENT,
        handleOracleTopDownCamera
      );
      runtime.container.removeEventListener(
        AREA_ORACLE_RENDER_VISIBILITY_EVENT,
        handleOracleRenderVisibility
      );
      runtime.container.removeEventListener(
        AREA_SHARED_RENDERER_SNAPSHOT_EVENT,
        handleAreaSharedRendererSnapshot
      );
      runtime.container.removeEventListener(
        ITEM_VISUAL_PROOF_REQUEST_EVENT,
        handleItemVisualProofRequest
      );
      delete runtime.container.dataset.itemVisualProofRequestListener;
      runtime.renderer.domElement.removeEventListener(
        "wheel",
        handleWheelCapture,
        wheelCaptureOptions
      );
      if (areaSharedRendererRefreshFrameId !== null) {
        window.cancelAnimationFrame(areaSharedRendererRefreshFrameId);
      }
      if (areaSharedRendererRefreshTimeoutId !== null) {
        window.clearTimeout(areaSharedRendererRefreshTimeoutId);
      }
      if (placeableModelLoadQueueProgressFrameId !== null) {
        window.cancelAnimationFrame(placeableModelLoadQueueProgressFrameId);
      }
      if (placeableModelLoadQueueProgressTimeoutId !== null) {
        window.clearTimeout(placeableModelLoadQueueProgressTimeoutId);
      }
      disposeRuntime(runtime);
      runtimeRef.current = null;
      setWebglReady(false);
      setPlaceableLoadOverlay(createHiddenAssetLoadOverlayState());
    };
  }, [clientAssetCachePort, userId]);

  useEffect(() => {
    if (!viewportFullscreen) {
      return;
    }
    let outerFrame: number | null = null;
    let innerFrame: number | null = null;
    const reframeFullscreenViewport = () => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return;
      }
      // The layout first hides the sidebars, then the canvas receives its new
      // dimensions. Waiting for two frames makes the camera use the expanded
      // aspect ratio rather than the narrow editor-column ratio used before
      // Full View was entered.
      resizeRuntime(runtime);
      const didRefit = refitFocusedPerspectiveCameraForVisibleTerrain(runtime);
      runtime.container.dataset.areaCameraFrameFullscreenRefit = didRefit
        ? "visible-terrain"
        : "pending-terrain";
      renderRuntime(runtime);
    };
    outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(reframeFullscreenViewport);
    });
    return () => {
      if (outerFrame !== null) {
        window.cancelAnimationFrame(outerFrame);
      }
      if (innerFrame !== null) {
        window.cancelAnimationFrame(innerFrame);
      }
    };
  }, [viewportFullscreen]);

  useEffect(() => {
    applyWorkspaceRuntimeLightBudget(runtimeRef.current, workspaceOptions.runtimeMaxLights);
  }, [workspaceOptions.runtimeMaxLights]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const normalizedToken = placeableAssetAccessToken?.trim() || null;
    applyPlaceableAssetRequestHeaders(runtime, normalizedToken);
    if (placeableAssetAccessTokenRef.current !== normalizedToken) {
      runtime.placeableModelCacheByUrl.clear();
      runtime.placeableModelPendingByUrl.clear();
      clearPlaceableModelLoadQueue(runtime);
      runtime.placeableTextureCacheByUrl.clear();
      runtime.placeableTexturePendingByUrl.clear();
      clearPlaceableTextureLoadQueue(runtime);
      placeableAssetAccessTokenRef.current = normalizedToken;
    }
  }, [placeableAssetAccessToken]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const setCtrlPan = (ctrlPanEnabled: boolean) => {
      applyOrbitPointerBindings(runtime.controls, { ctrlPanEnabled });
    };

    setCtrlPan(false);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        setCtrlPan(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        setCtrlPan(false);
      }
    };

    const handleWindowBlur = () => {
      setCtrlPan(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      setCtrlPan(false);
    };
  }, []);

  useEffect(() => {
    if (!placeableLoadOverlay.visible) {
      return;
    }
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (isRuntimeAreaSharedRendererModelLoadComplete(runtime)) {
        setAreaSharedRendererModelLoadComplete(true);
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
        return;
      }
      if (isCreaturePreviewCoreRenderable(runtime)) {
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
        return;
      }
      if (
        !hasActivePlaceableModelLoadQueue(runtime) &&
        runtime.placeableModelPendingByUrl.size === 0
      ) {
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
      }
    }, 220);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [placeableLoadOverlay.visible]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    runtime.controls.enabled = !effectivePlaceableLoadOverlay.visible;
    if (!effectivePlaceableLoadOverlay.visible && areaLoadOverlay.visible) {
      runtime.controls.enabled = false;
    }
    runtime.container.dataset.areaCanvasInteractionBlocked = isCanvasAssetLoading
      ? "asset-loading"
      : "false";
    runtime.container.dataset.areaCanvasInteractionBlockedSource = isCanvasAssetLoading
      ? canvasLoadOverlay.source
      : "";
    runtime.renderer.domElement.style.cursor = effectivePlaceableLoadOverlay.visible
      ? "progress"
      : areaLoadOverlay.visible
        ? "progress"
        : "crosshair";
    if (!isCanvasAssetLoading) {
      runtime.controls.update();
    }

    return () => {
      runtime.controls.enabled = true;
      runtime.container.dataset.areaCanvasInteractionBlocked = "false";
      runtime.container.dataset.areaCanvasInteractionBlockedSource = "";
      runtime.renderer.domElement.style.cursor = "crosshair";
    };
  }, [
    areaLoadOverlay.visible,
    canvasLoadOverlay.source,
    effectivePlaceableLoadOverlay.visible,
    isCanvasAssetLoading,
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    runtime.controls.rotateSpeed = workspaceOptions.cameraRotateSpeed;
    runtime.controls.zoomSpeed = workspaceOptions.cameraZoomSpeed;
    runtime.controls.panSpeed = workspaceOptions.cameraPanSpeed;
    runtime.controls.enableDamping = true;
    runtime.controls.dampingFactor = workspaceOptions.cameraDampingFactor;
    runtime.controls.update();
  }, [
    workspaceOptions.cameraDampingFactor,
    workspaceOptions.cameraPanSpeed,
    workspaceOptions.cameraRotateSpeed,
    workspaceOptions.cameraZoomSpeed
  ]);

  useEffect(() => {
    if (externalSceneSeed) {
      return;
    }
    setSceneHistory(sceneViewportPort.createInitialHistory(userId));
    setSelectedObjectIds([]);
    setSelectedTileId(null);
    commandRevisionRef.current = resolveWorkspaceCommandRevisionAfterSceneReset(
      commandRevisionRef.current,
      latestCommandRevisionRef.current,
    );
  }, [externalSceneSeed, sceneViewportPort, userId]);

  useEffect(() => {
    if (!externalSceneSeed) {
      observedExternalSceneSeedRef.current = externalSceneSeed;
      return;
    }
    const shouldApply = shouldApplyWorkspaceExternalSceneSeed(
      observedExternalSceneSeedRef.current,
      externalSceneSeed,
      sceneRef.current,
      areaEditorMutationSignal?.scene
    );
    observedExternalSceneSeedRef.current = externalSceneSeed;
    if (!shouldApply) {
      return;
    }
    setSceneHistory(sceneViewportPort.createHistoryFromScene(externalSceneSeed));
    setSelectedObjectIds([]);
    setSelectedTileId(null);
    commandRevisionRef.current = resolveWorkspaceCommandRevisionAfterSceneReset(
      commandRevisionRef.current,
      latestCommandRevisionRef.current,
    );
    const runtime = runtimeRef.current;
    if (runtime) {
      centerCameraForScene(runtime, externalSceneSeed, {
        objectPreview: !shouldRenderAreaGeometry(renderObjectIds)
      });
    }
  }, [areaEditorMutationSignal?.scene, externalSceneSeed, renderObjectIds, sceneViewportPort]);

  useWorkspaceAreaEditorMutationSignal(
    areaEditorMutationSignal,
    scene.sceneId,
    sceneViewportPort,
    setSceneHistory,
    setSelectedTileId,
    onAreaEditorMutationApplied
  );

  useEffect(() => {
    nextObjectSequenceRef.current = scene.objects.length + 1;
  }, [scene.objects.length]);

  useEffect(() => {
    const scopedKind = OBJECT_KIND_BY_SCOPE[toolbarState.selectionScope];
    if (scopedKind) {
      setObjectBrush(scopedKind);
    }
  }, [toolbarState.selectionScope]);

  useEffect(() => {
    setSelectedObjectIds((current) =>
      filterSelectedObjectIdsForVisibleSelectableObjects({
        selectedObjectIds: current,
        objectById,
        visibleObjectIdsSet,
        isSelectableByActiveFilters
      })
    );
  }, [isSelectableByActiveFilters, objectById, visibleObjectIdsSet]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);

    const areaOracleCleanCanvasActive =
      runtime.container.dataset.areaOracleCleanCanvas === "true";
    rebuildGridLayer(runtime, scene, viewportFacade, sceneGridVisibility.renderTileOverlayLayer);
    runtime.gridLayer.visible = areaOracleCleanCanvasActive
      ? false
      : sceneGridVisibility.renderGridLayer;
    runtime.tileOverlayLayer.visible = areaOracleCleanCanvasActive
      ? false
      : sceneGridVisibility.renderTileOverlayLayer;
    writeAreaTileOverlayRuntimeDiagnostics(runtime, {
      optionEnabled: workspaceOptions.showTileGridOverlay,
      renderLayerVisible: sceneGridVisibility.renderTileOverlayLayer
    });
    runtime.axesHelper.visible = areaOracleCleanCanvasActive
      ? false
      : toolbarState.canvasDebug.axes;
    updateAxesHelperForScene(runtime, scene, sceneScale);

    if (renderAreaGeometry) {
      rebuildTerrainMesh(
        runtime,
        scene,
        selectedTileId,
        toolbarState.canvasDebug,
        areaTileProcessReadiness ?? null
      );
      rebuildChunkBounds(runtime, scene, toolbarState.canvasDebug.chunkBounds);
    } else {
      clearTerrainMesh(runtime);
      rebuildChunkBounds(runtime, scene, false);
    }

    writeAreaTileProcessRuntimeDiagnostics(runtime, areaTileProcessReadiness ?? null);
    writeAuroraScenePointLightDiagnostics(runtime);
  }, [
    renderAreaGeometry,
    sceneGridVisibility,
    sceneViewportPort,
    scene,
    selectedTileId,
    toolbarState.canvasDebug.axes,
    toolbarState.canvasDebug.chunkBounds,
    toolbarState.canvasDebug.ceilingMeshes,
    toolbarState.canvasDebug.displayFog,
    toolbarState.canvasDebug.hiddenMeshes,
    toolbarState.canvasDebug.textureCompression,
    toolbarState.canvasDebug.textures,
    toolbarState.canvasDebug.useAreaLighting,
    toolbarState.canvasDebug.walkmeshOverlay,
    toolbarState.canvasDebug.wireframe,
    workspaceOptions.showTileGridOverlay,
    workspaceOptions.runtimeMaxLights,
    areaTileProcessReadiness,
    placeableAssetAccessToken,
    viewportFacade
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);
    const areaOracleCleanCanvasActive =
      runtime.container.dataset.areaOracleCleanCanvas === "true";
    const renderSelectedObjectIds = areaOracleCleanCanvasActive
      ? readAreaOracleRenderPriorityObjectIds(runtime)
      : selectedObjectIdsRef.current;
    const objectMeshDebugState = areaOracleCleanCanvasActive
      ? resolveAreaOracleCleanCanvasDebugState(toolbarState.canvasDebug)
      : toolbarState.canvasDebug;

    rebuildObjectMeshes(
      runtime,
      visibleObjects,
      renderSelectedObjectIds,
      objectMeshDebugState,
      scene.width,
      scene.height,
      sceneScale,
      renderAreaGeometry,
      adjustLocationUnitsPerTile,
      runtimeSoundNowPlayingBadges,
      workspaceOptions.showRuntimeSoundNowPlaying,
      placeableRenderPayloadByObjectId ?? null,
      creatureRenderPayloadByObjectId ?? null,
      scene.auroraVfxCollision ?? null
    );
    writePlaceableTwoDaLightRenderDiagnostics(runtime);
    writeAuroraScenePointLightDiagnostics(runtime);
    safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
    scheduleAreaSharedRendererRuntimeSnapshotEvidenceRefresh(runtime);
    if (!renderAreaGeometry) {
      framePlaceablesVfxPreviewIfNeeded(
        runtime,
        visibleObjects,
        placeableRenderPayloadByObjectId ?? null
      );
      writeSinglePlaceablesVfxPreviewDiagnostics(
        runtime,
        visibleObjects,
        placeableRenderPayloadByObjectId ?? null
      );
    } else {
      clearPlaceablesVfxPreviewDrawMetrics(runtime);
    }
  }, [
    renderAreaGeometry,
    scene.width,
    scene.height,
    sceneViewportPort,
    toolbarState.canvasDebug.bounds,
    toolbarState.canvasDebug.collisionOverlay,
    toolbarState.canvasDebug.displayShadows,
    toolbarState.canvasDebug.hiddenMeshes,
    toolbarState.canvasDebug.lockedKinds.creatures,
    toolbarState.canvasDebug.lockedKinds.doors,
    toolbarState.canvasDebug.lockedKinds.encounters,
    toolbarState.canvasDebug.lockedKinds.items,
    toolbarState.canvasDebug.lockedKinds.placeables,
    toolbarState.canvasDebug.lockedKinds.sounds,
    toolbarState.canvasDebug.lockedKinds.stores,
    toolbarState.canvasDebug.lockedKinds.triggers,
    toolbarState.canvasDebug.lockedKinds.waypoints,
    toolbarState.canvasDebug.objectLabels,
    toolbarState.canvasDebug.showNonRenderMeshes,
    toolbarState.canvasDebug.showVtPhysicalAnchor,
    toolbarState.canvasDebug.statusMap,
    toolbarState.canvasDebug.textures,
    toolbarState.canvasDebug.wireframe,
    visibleObjects,
    adjustLocationUnitsPerTile,
    runtimeSoundNowPlayingBadges,
    placeableRenderPayloadByObjectId,
    creatureRenderPayloadByObjectId,
    workspaceOptions.runtimeMaxLights,
    workspaceOptions.showRuntimeSoundNowPlaying
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);
    const renderSelectedObjectIds =
      runtime.container.dataset.areaOracleCleanCanvas === "true"
        ? []
        : selectedObjectIds;
    const objectMeshDebugState =
      runtime.container.dataset.areaOracleCleanCanvas === "true"
        ? resolveAreaOracleCleanCanvasDebugState(toolbarState.canvasDebug)
        : toolbarState.canvasDebug;
    updateObjectMeshSelectionState(
      runtime,
      visibleObjects,
      renderSelectedObjectIds,
      objectMeshDebugState,
      sceneScale,
      renderAreaGeometry
    );
  }, [
    renderAreaGeometry,
    scene.width,
    scene.height,
    sceneViewportPort,
    selectedObjectIds,
    toolbarState.canvasDebug,
    visibleObjects
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    if (areaObjectDiagnosticsTimerRef.current !== null) {
      clearTimeout(areaObjectDiagnosticsTimerRef.current);
    }
    areaObjectDiagnosticsTimerRef.current = setTimeout(() => {
      if (!runtimeRef.current) {
        return;
      }
      writePlaceableTwoDaLightRenderDiagnostics(runtimeRef.current);
      writeSoundRenderDiagnostics(runtimeRef.current);
      writeAuroraScenePointLightDiagnostics(runtimeRef.current);
      writeAreaObjectSourceDiagnostics(
        runtimeRef.current,
        visibleObjects,
        selectedObjectIds,
        placeableRenderPayloadByObjectId ?? null,
        creatureRenderPayloadByObjectId ?? null
      );
      areaObjectDiagnosticsTimerRef.current = null;
    }, AREA_OBJECT_RUNTIME_DIAGNOSTICS_DEBOUNCE_MS);

    return () => {
      if (areaObjectDiagnosticsTimerRef.current !== null) {
        clearTimeout(areaObjectDiagnosticsTimerRef.current);
        areaObjectDiagnosticsTimerRef.current = null;
      }
    };
  }, [
    selectedObjectIds,
    visibleObjects,
    placeableRenderPayloadByObjectId,
    creatureRenderPayloadByObjectId
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);
    const objectRenderScale = resolveSceneObjectRenderScale(sceneScale, renderAreaGeometry);

    rebuildGizmoOverlay(
      runtime,
      selectedObjectIds,
      objectById,
      toolbarState.canvasDebug,
      objectRenderScale
    );
  }, [
    objectById,
    renderAreaGeometry,
    scene,
    sceneViewportPort,
    selectedObjectIds,
    toolbarState.canvasDebug.gizmoMode,
    toolbarState.canvasDebug.lockedKinds.creatures,
    toolbarState.canvasDebug.lockedKinds.doors,
    toolbarState.canvasDebug.lockedKinds.encounters,
    toolbarState.canvasDebug.lockedKinds.items,
    toolbarState.canvasDebug.lockedKinds.placeables,
    toolbarState.canvasDebug.lockedKinds.sounds,
    toolbarState.canvasDebug.lockedKinds.stores,
    toolbarState.canvasDebug.lockedKinds.triggers,
    toolbarState.canvasDebug.lockedKinds.waypoints
  ]);

  useWorkspaceTransformControls({
    runtimeRef,
    transformRuntimePort: workspaceThreeTransformRuntimePort,
    scene,
    sceneViewportPort,
    selectedObjectIds,
    objectById,
    visibleObjects,
    toolbarState,
    setSceneHistory,
    setSelectedTileId,
    trackTelemetry,
    userId
  });

  const focusCameraOnWorldPoint = useCallback((worldX: number, worldY: number) => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    focusCameraOnPoint(runtime, worldX, worldY);
  }, []);

  const handleAreaWorkspaceStatusChange = useCallback(
    (event: AreaWorkspaceStatusEvent) => {
      if (event.lane === "draft") {
        setAreaWorkspaceDraftStatus((current) => {
          if (current.sceneId !== event.sceneId) return event;
          if (event.sceneUpdatedAtUnixMs < current.sceneUpdatedAtUnixMs) return current;
          return event.commandRevision >= current.commandRevision ? event : current;
        });
      }
      onAreaWorkspaceStatusChange?.(event);
    },
    [onAreaWorkspaceStatusChange]
  );

  useWorkspaceCommandSignal({
    commandSignal,
    commandRevisionRef,
    runtimeRef,
    bookmark1Ref,
    cameraRuntimePort: workspaceThreeCameraRuntimePort,
    scene,
    sceneViewportPort,
    areaLifecycleFacade,
    areaDraftSessionRegistry,
    onAreaDraftPersisted,
    setSceneHistory,
    setSelectedObjectIds,
    setSelectedTileId,
    setLastSavedAtUnixMs,
    onAreaWorkspaceStatusChange: handleAreaWorkspaceStatusChange,
    copySelectedObjectsToClipboard: copyWorkspaceSelectionToClipboard,
    deleteSelectedObjects: deleteWorkspaceSelection,
    duplicateObjects,
    isSelectableByActiveFilters,
    renderAreaGeometry,
    selectedObjectIds,
    selectedTileIds,
    tileProcessReadiness: areaTileProcessReadiness,
    toolbarState,
    userId,
    visibleObjects,
    trackTelemetry
  });

  useWorkspaceKeyboardObjectActions({
    selectedObjectCount: visibleSelectableSelectedObjectIds.length + selectedTileIds.length,
    toolbarState,
    workspaceOptions,
    copySelectedObjectsToClipboard: copyWorkspaceSelectionToClipboard,
    cutSelectedObjectsToClipboard: cutWorkspaceSelectionToClipboard,
    deleteSelectedObjects: deleteWorkspaceSelection,
    moveSelectedObjectsByDelta,
    pasteClipboardObjects: pasteWorkspaceClipboard
  });

  const {
    handleMouseDown,
    handleDoubleClick,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  } = useWorkspacePointerSelection({
    runtimeRef,
    pointerRuntimePort: workspaceThreePointerRuntimePort,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    scene,
    sceneViewportPort,
    viewportFacade,
    visibleObjects,
    selectedObjectIds,
    selectedTileIds,
    selectionBox,
    setSelectionBox,
    setSelectedObjectIds,
    setSelectedTileId,
    setSelectedTileIds,
    setSceneHistory,
    setContextMenu,
    toolbarState,
    workspaceOptions,
    objectBrush,
    terrainBrush,
    areaEditingTool,
    tileProductionCertification,
    syncAuroraAreaPlacementPreview: syncAreaTilePlacementPreviewOverlay,
    clearAuroraAreaPlacementPreview: clearAreaTilePlacementPreviewOverlay,
    onAuroraAreaEditingFeedback: (feedback) => {
      clearClipboardFeedback();
      setAreaPlacementFeedback(feedback);
    },
    lastPointerWorldRef,
    nextObjectSequenceRef,
    isSelectableByActiveFilters,
    moveSelectedObjectsByDelta,
    trackTelemetry,
    userId
  });

  const blockCanvasPointerWhileLoading = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);
  const canvasObjectAddMouseDownHandledRef = useRef(false);

  const canUseAreaGridPointerWhileAssetsLoad = useCallback(() => {
    const runtime = runtimeRef.current;
    return canUseAuroraAreaGridPointerDuringAssetLoading({
      scene,
      selectionMode: toolbarState.selectionMode,
      areaEditingTool,
      objectAddPlacementActive: objectAddPlacementMode !== null,
      transformInteractionActive: runtime
        ? workspaceThreePointerRuntimePort.isTransformInteractionActive(runtime)
        : false
    });
  }, [areaEditingTool, objectAddPlacementMode, runtimeRef, scene, toolbarState.selectionMode]);

  const shouldBlockCanvasPointerForAssetLoading = useCallback(
    () => isCanvasAssetLoading && !canUseAreaGridPointerWhileAssetsLoad(),
    [canUseAreaGridPointerWhileAssetsLoad, isCanvasAssetLoading]
  );

  const handleCanvasMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const blockedForAssetLoading = shouldBlockCanvasPointerForAssetLoading();
      if (blockedForAssetLoading) {
        blockCanvasPointerWhileLoading(event);
        return;
      }
      if (handleCanvasObjectAddMouseDown(event)) {
        canvasObjectAddMouseDownHandledRef.current = event.button === 0;
        return;
      }
      handleMouseDown(event);
    },
    [
      blockCanvasPointerWhileLoading,
      handleCanvasObjectAddMouseDown,
      handleMouseDown,
      shouldBlockCanvasPointerForAssetLoading
    ]
  );

  const handleCanvasClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (canvasObjectAddMouseDownHandledRef.current) {
        canvasObjectAddMouseDownHandledRef.current = false;
        return;
      }
      if (handleCanvasObjectAddMouseDown(event)) {
        return;
      }
    },
    [handleCanvasObjectAddMouseDown]
  );

  const handleCanvasMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (shouldBlockCanvasPointerForAssetLoading()) {
        blockCanvasPointerWhileLoading(event);
        return;
      }
      if (handleCanvasObjectAddMouseMove(event)) {
        return;
      }
      handleMouseMove(event);
    },
    [
      blockCanvasPointerWhileLoading,
      handleCanvasObjectAddMouseMove,
      handleMouseMove,
      shouldBlockCanvasPointerForAssetLoading
    ]
  );

  const handleCanvasDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (shouldBlockCanvasPointerForAssetLoading()) {
        blockCanvasPointerWhileLoading(event);
        return;
      }
      if (objectAddPlacementMode) return;
      handleDoubleClick(event);
    },
    [
      blockCanvasPointerWhileLoading,
      handleDoubleClick,
      objectAddPlacementMode,
      shouldBlockCanvasPointerForAssetLoading
    ]
  );

  const handleCanvasMouseUp = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (shouldBlockCanvasPointerForAssetLoading()) {
        blockCanvasPointerWhileLoading(event);
        return;
      }
      handleMouseUp(event);
    },
    [blockCanvasPointerWhileLoading, handleMouseUp, shouldBlockCanvasPointerForAssetLoading]
  );

  const handleCanvasMouseLeave = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (handleCanvasObjectAddMouseLeave()) {
        return;
      }
      handleMouseLeave();
      handleCanvasMouseUp(event);
    },
    [handleCanvasMouseUp, handleCanvasObjectAddMouseLeave, handleMouseLeave]
  );

  const handleCanvasWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      const runtime = runtimeRef.current;
      if (
        !shouldConsumeCanvasWheelForCamera(runtime, event.deltaY, {
          loading: isCanvasAssetLoading
        })
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.focus({ preventScroll: true });
    },
    [isCanvasAssetLoading]
  );

  useEffect(() => {
    return () => {
      const runtime = runtimeRef.current;
      if (runtime) {
        runtime.controls.enabled = true;
      }
    };
  }, []);

  const clampAdjustLocationDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: adjustLocationDialogRef.current,
        x,
        y,
        fallbackWidthPx: ADJUST_LOCATION_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: ADJUST_LOCATION_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect
      }),
    []
  );

  const openAdjustLocationDialog = useCallback(
    (targets: SceneObject[]) => {
      if (targets.length === 0) {
        return;
      }
      const targetIds = targets.map((object) => object.id);

      const source = targets[0];
      const hostRect = hostRef.current?.getBoundingClientRect();
      const preferredX = hostRect
        ? hostRect.width - ADJUST_LOCATION_DIALOG_FALLBACK_WIDTH_PX - ADJUST_LOCATION_DIALOG_MARGIN_PX
        : ADJUST_LOCATION_DIALOG_MARGIN_PX;
      const preferredY = ADJUST_LOCATION_DIALOG_MARGIN_PX;
      const initialDialogPosition = clampAdjustLocationDialogPosition(preferredX, preferredY);
      const visualTransformMeta = resolveAdjustLocationVisualTransformMeta(targets);
      const snapshotObjects = targets.map(cloneSceneObject);
      setSelectedObjectIds(targetIds);
      setAdjustLocationDialog({
        objectIds: targetIds,
        snapshotObjects,
        showVisualTransforms: visualTransformMeta.showVisualTransforms,
        mixedStaticPlaceables: visualTransformMeta.mixedStaticPlaceables,
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        collapsed: false,
        draft: buildAdjustLocationDraft(
          source,
          adjustLocationUnitsPerTile,
          scene.width,
          scene.height
        )
      });
      trackTelemetry("scene.adjust_location.open", {
        userId,
        selectedCount: targets.length,
        visualTransforms: visualTransformMeta.showVisualTransforms
      });
    },
    [
      adjustLocationUnitsPerTile,
      clampAdjustLocationDialogPosition,
      cloneSceneObject,
      scene.height,
      scene.width,
      trackTelemetry,
      userId
    ]
  );

  const updateAdjustLocationDraftField = useCallback(
    (field: keyof AdjustLocationDraft, rawValue: string) => {
      setAdjustLocationDialog((current) =>
        {
          if (!current) {
            return current;
          }
          const nextDraft = resolveNextAdjustLocationDraftField(
            current.draft,
            field,
            rawValue
          );
          if (!nextDraft) {
            return current;
          }
          return {
            ...current,
            draft: nextDraft
          };
        }
      );
    },
    []
  );

  const resolveSceneWithAdjustLocationDraft = useCallback(
    (sourceScene: AreaScene, dialogState: AdjustLocationDialogState): AreaScene => {
      const draft = dialogState.draft;
      const objectIds = dialogState.objectIds;
      const includeVisualTransforms = dialogState.showVisualTransforms;
      const draftZWorld = fromAdjustLocationHeight(draft.z, adjustLocationUnitsPerTile);
      let nextScene = sceneViewportPort.setObjectsAbsoluteLocationByIds(
        sourceScene,
        objectIds,
        {
          x: fromAdjustLocationCoordinate(draft.x, scene.width, adjustLocationUnitsPerTile),
          y: fromAdjustLocationCoordinate(draft.y, scene.height, adjustLocationUnitsPerTile),
          z: draftZWorld,
          bearing: toRadians(draft.bearingDeg)
        }
      );
      if (includeVisualTransforms) {
        nextScene = sceneViewportPort.setObjectsVisualTransformByIds(
          nextScene,
          objectIds,
          buildAdjustLocationVisualTransformInput(draft, adjustLocationUnitsPerTile)
        );
      }
      return nextScene;
    },
    [adjustLocationUnitsPerTile, scene.height, scene.width, sceneViewportPort]
  );

  useEffect(() => {
    if (!adjustLocationDialog || adjustLocationDialog.objectIds.length === 0) {
      return;
    }
    setSceneHistory((current) => {
      const baseScene = sceneViewportPort.restoreObjectsPlacementBySnapshots(
        current.present,
        adjustLocationDialog.snapshotObjects
      );
      const nextPreviewScene = resolveSceneWithAdjustLocationDraft(baseScene, adjustLocationDialog);
      if (
        areObjectPlacementsEqual(
          current.present,
          nextPreviewScene,
          adjustLocationDialog.objectIds,
          adjustLocationDialog.showVisualTransforms
        )
      ) {
        return current;
      }
      return {
        ...current,
        present: nextPreviewScene
      };
    });
  }, [
    adjustLocationDialog,
    adjustLocationDialog?.draft,
    adjustLocationDialog?.objectIds,
    adjustLocationDialog?.showVisualTransforms,
    adjustLocationDialog?.snapshotObjects,
    resolveSceneWithAdjustLocationDraft,
    sceneViewportPort
  ]);

  const applyAdjustLocationDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!adjustLocationDialog || adjustLocationDialog.objectIds.length === 0) {
        return;
      }

      const objectIds = adjustLocationDialog.objectIds;
      const includeVisualTransforms = adjustLocationDialog.showVisualTransforms;

      setSceneHistory((current) => {
        const baseScene = sceneViewportPort.restoreObjectsPlacementBySnapshots(
          current.present,
          adjustLocationDialog.snapshotObjects
        );
        const finalScene = resolveSceneWithAdjustLocationDraft(baseScene, adjustLocationDialog);
        if (
          areObjectPlacementsEqual(
            baseScene,
            finalScene,
            objectIds,
            includeVisualTransforms
          )
        ) {
          return current;
        }
        return sceneViewportPort.commitHistory(
          {
            ...current,
            present: baseScene
          },
          finalScene
        );
      });

      trackTelemetry("scene.adjust_location.apply", {
        userId,
        selectedCount: objectIds.length,
        closeAfterApply,
        visualTransforms: includeVisualTransforms
      });

      if (closeAfterApply) {
        setAdjustLocationDialog(null);
      }
    },
    [
      adjustLocationDialog,
      sceneViewportPort,
      trackTelemetry,
      userId,
      resolveSceneWithAdjustLocationDraft
    ]
  );

  const cancelAdjustLocationDialog = useCallback(() => {
    if (adjustLocationDialog && adjustLocationDialog.snapshotObjects.length > 0) {
      setSceneHistory((current) => {
        const restoredScene = sceneViewportPort.restoreObjectsPlacementBySnapshots(
          current.present,
          adjustLocationDialog.snapshotObjects
        );
        if (
          areObjectPlacementsEqual(
            current.present,
            restoredScene,
            adjustLocationDialog.objectIds,
            adjustLocationDialog.showVisualTransforms
          )
        ) {
          return current;
        }
        return {
          ...current,
          present: restoredScene
        };
      });
      trackTelemetry("scene.adjust_location.cancel", {
        userId,
        selectedCount: adjustLocationDialog.snapshotObjects.length
      });
    }
    setAdjustLocationDialog(null);
  }, [adjustLocationDialog, sceneViewportPort, trackTelemetry, userId]);

  const toggleAdjustLocationDialogCollapsed = useCallback(() => {
    setAdjustLocationDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startAdjustLocationDialogDrag,
    onHeaderPointerMove: moveAdjustLocationDialogDrag,
    onHeaderPointerUp: endAdjustLocationDialogDrag,
    onHeaderPointerCancel: cancelAdjustLocationDialogDrag
  } = usePropertyDialogDrag({
    dialog: adjustLocationDialog,
    setDialog: setAdjustLocationDialog,
    hostRef,
    panelRef: adjustLocationDialogRef,
    dragRef: adjustLocationDialogDragRef,
    clampPosition: clampAdjustLocationDialogPosition
  });

  const clampAreaObjectPolygonDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: areaObjectPolygonDialogRef.current,
        x,
        y,
        fallbackWidthPx: AREA_OBJECT_POLYGON_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: AREA_OBJECT_POLYGON_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect,
      }),
    [],
  );

  const openAreaObjectPolygonDialog = useCallback((target: SceneObject) => {
    const draft = buildAreaObjectPolygonDraft(
      target,
      sceneRef.current?.placeableFactionCatalog,
      sceneRef.current?.encounterDifficultyCatalog,
    );
    if (!draft) return;
    const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
    const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
    const runtime = runtimeRef.current;
    const position = runtime
      ? resolveAnchoredContextMenuPosition(
          runtime,
          target,
          target.id,
          anchorOffsetX,
          anchorOffsetY,
          AREA_OBJECT_POLYGON_DIALOG_FALLBACK_WIDTH_PX,
          AREA_OBJECT_POLYGON_DIALOG_FALLBACK_HEIGHT_PX,
        )
      : clampAreaObjectPolygonDialogPosition(
          ADJUST_LOCATION_DIALOG_MARGIN_PX,
          ADJUST_LOCATION_DIALOG_MARGIN_PX,
        );
    setAreaObjectPolygonDialog({
      objectId: target.id,
      objectKind: draft.objectKind,
      snapshotObject: cloneSceneObject(target),
      draft,
      validationMessage: null,
      windowX: position.x,
      windowY: position.y,
      anchorOffsetX,
      anchorOffsetY,
      collapsed: false,
    });
    trackTelemetry("scene.area_object_polygon.open", {
      userId,
      objectId: target.id,
      objectKind: target.kind,
      pointCount: draft.points.length,
    });
  }, [clampAreaObjectPolygonDialogPosition, trackTelemetry, userId]);

  const updateAreaObjectPolygonPoint = useCallback((
    pointIndex: number,
    field: AreaObjectPolygonPointField,
    value: string,
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftPoint(current.draft, pointIndex, field, value),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonTag = useCallback((value: string) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftTag(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonActive = useCallback((value: boolean) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftActive(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonPlayerOnly = useCallback((value: boolean) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftPlayerOnly(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonReset = useCallback((value: boolean) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftReset(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonResetTime = useCallback((value: number) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftResetTime(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonSpawnOption = useCallback((value: 0 | 1) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftSpawnOption(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonRespawnsFinite = useCallback((value: number) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftRespawnsFinite(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonRespawnsInfinite = useCallback((value: boolean) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftRespawnsInfinite(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonMaximumCreatures = useCallback((value: number) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftMaximumCreatures(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonMinimumCreatures = useCallback((value: number) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftMinimumCreatures(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonScriptResRef = useCallback((
    field: EncounterScriptResRefField,
    value: string,
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftScriptResRef(
            current.draft,
            current.snapshotObject.source,
            field,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonTriggerScriptResRef = useCallback((
    field: TriggerScriptResRefField,
    value: string,
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftTriggerScriptResRef(
            current.draft,
            current.snapshotObject.source,
            field,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonTriggerTransitionStorage = useCallback((
    value: TriggerTransitionStorage,
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftTriggerTransitionStorage(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonTriggerCoreProperties = useCallback((
    value: TriggerCoreProperties,
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftTriggerCoreProperties(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonTriggerTrapProperties = useCallback((
    value: TriggerTrapProperties,
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftTriggerTrapProperties(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonFaction = useCallback((value: number) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftFaction(
            current.draft,
            current.snapshotObject.source,
            sceneRef.current?.placeableFactionCatalog,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonDifficulty = useCallback((difficultyIndex: number) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftDifficulty(
            current.draft,
            current.snapshotObject.source,
            sceneRef.current?.encounterDifficultyCatalog,
            difficultyIndex,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonLocalizedName = useCallback((value: string) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftLocalizedName(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonTemplateResRef = useCallback((value: string) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftTemplateResRef(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonEditorComment = useCallback((value: string) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftEditorComment(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonVariables = useCallback((
    value: readonly AuroraVariableTargetEntry[],
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftVariables(
            current.draft,
            current.snapshotObject.source,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonCreatureSingleSpawn = useCallback((
    index: number,
    value: boolean,
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftCreatureSingleSpawn(
            current.draft,
            current.snapshotObject.source,
            index,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const addAreaObjectPolygonCreature = useCallback((
    entry: SceneObjectEncounterCreatureListBlueprintTargetEntry,
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: appendAreaObjectPolygonDraftCreature(
            current.draft,
            current.snapshotObject.source,
            entry,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const replaceAreaObjectPolygonCreature = useCallback((
    index: number,
    entry: SceneObjectEncounterCreatureListBlueprintTargetEntry,
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: replaceAreaObjectPolygonDraftCreature(
            current.draft,
            current.snapshotObject.source,
            index,
            entry,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const removeAreaObjectPolygonCreatureEntry = useCallback((index: number) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: removeAreaObjectPolygonDraftCreature(
            current.draft,
            current.snapshotObject.source,
            index,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const moveAreaObjectPolygonCreatureEntry = useCallback((
    index: number,
    direction: -1 | 1,
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: moveAreaObjectPolygonDraftCreature(
            current.draft,
            current.snapshotObject.source,
            index,
            direction,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const updateAreaObjectPolygonSpawnPoint = useCallback((
    index: number,
    field: AreaObjectPolygonSpawnPointField,
    value: number,
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: updateAreaObjectPolygonDraftSpawnPoint(
            current.draft,
            current.snapshotObject.source,
            index,
            field,
            value,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const addAreaObjectPolygonSpawnPoint = useCallback(() => {
    setAreaObjectPolygonDialog((current) => {
      if (!current) return current;
      const previous = current.draft.spawnPoints?.at(-1);
      const seed = previous ?? {
        nativeX: Math.fround(current.snapshotObject.x),
        nativeY: Math.fround(current.snapshotObject.y),
        nativeZ: Math.fround(current.snapshotObject.z),
        orientation: 0,
      };
      return {
        ...current,
        draft: appendAreaObjectPolygonDraftSpawnPoint(
          current.draft,
          current.snapshotObject.source,
          seed,
        ),
        validationMessage: null,
      };
    });
  }, []);

  const removeAreaObjectPolygonSpawnPoint = useCallback((index: number) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: removeAreaObjectPolygonDraftSpawnPoint(
            current.draft,
            current.snapshotObject.source,
            index,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const moveAreaObjectPolygonSpawnPoint = useCallback((
    index: number,
    direction: -1 | 1,
  ) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: moveAreaObjectPolygonDraftSpawnPoint(
            current.draft,
            current.snapshotObject.source,
            index,
            direction,
          ),
          validationMessage: null,
        }
      : current);
  }, []);

  const addAreaObjectPolygonPoint = useCallback(() => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: appendAreaObjectPolygonDraftPoint(current.draft),
          validationMessage: null,
        }
      : current);
  }, []);

  const removeAreaObjectPolygonPoint = useCallback((pointIndex: number) => {
    setAreaObjectPolygonDialog((current) => current
      ? {
          ...current,
          draft: removeAreaObjectPolygonDraftPoint(current.draft, pointIndex),
          validationMessage: null,
        }
      : current);
  }, []);

  const resetAreaObjectPolygonToSource = useCallback(() => {
    setAreaObjectPolygonDialog((current) => {
      if (!current) return current;
      const sourceDraft = buildAreaObjectPolygonDraft({
        ...current.snapshotObject,
        polygonGeometry: undefined,
        ...(current.objectKind === "encounters"
          ? {
            encounterActive:
              current.snapshotObject.source?.encounterActiveStorage,
            encounterPlayerOnly:
              current.snapshotObject.source?.encounterPlayerOnlyStorage,
            encounterReset:
              current.snapshotObject.source?.encounterResetStorage,
            encounterResetTime:
              current.snapshotObject.source?.encounterResetTimeStorage,
            encounterSpawnOption:
              current.snapshotObject.source?.encounterSpawnOptionStorage,
            encounterRespawns:
              current.snapshotObject.source?.encounterRespawnsStorage,
            encounterCreatureCounts:
              current.snapshotObject.source?.encounterCreatureCountsStorage,
            encounterScriptResRefs:
              current.snapshotObject.source?.encounterScriptResRefsStorage,
            encounterFactionId:
              current.snapshotObject.source?.encounterFaction?.expectedValue,
            encounterDifficulty:
              current.snapshotObject.source?.encounterDifficulty?.expectedValue,
            encounterLocalizedName:
              readExistingEncounterLocalizedName(current.snapshotObject.source),
            encounterProperties: {
              ...current.snapshotObject.encounterProperties,
              spawnPoints:
                current.snapshotObject.source?.encounterSpawnPoints?.expectedEntries.map(
                  ({ sourceIndex: _, ...entry }) => ({ ...entry }),
              ),
            },
          }
          : current.objectKind === "triggers"
            ? {
              triggerScriptResRefs:
                current.snapshotObject.source?.triggerScriptResRefsStorage,
              triggerTransitionStorage:
                current.snapshotObject.source?.triggerTransitionStorage,
              triggerCoreProperties:
                current.snapshotObject.source?.triggerCoreProperties,
              triggerTrapProperties:
                current.snapshotObject.source?.triggerTrapProperties,
              triggerVariables:
                current.snapshotObject.source?.triggerVariables?.expectedEntries.map(
                  ({ sourceIndex: _, ...entry }) => ({ ...entry }),
                ),
            }
            : {}),
      },
      sceneRef.current?.placeableFactionCatalog,
      sceneRef.current?.encounterDifficultyCatalog);
      return sourceDraft
        ? { ...current, draft: sourceDraft, validationMessage: null }
        : current;
    });
  }, []);

  const applyAreaObjectPolygonDraft = useCallback((closeAfterApply: boolean) => {
    if (!areaObjectPolygonDialog) return;
    const geometry = materializeAreaObjectPolygonDraft(areaObjectPolygonDialog.draft);
    if (!geometry) {
      setAreaObjectPolygonDialog((current) => current
        ? {
            ...current,
            validationMessage: "Enter 3..1024 finite points with a non-zero signed XY area.",
          }
        : current);
      return;
    }
    const objectId = areaObjectPolygonDialog.objectId;
    const tag = materializeAreaObjectPolygonDraftTag(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      areaObjectPolygonDialog.snapshotObject.tag,
    );
    const encounterActive = materializeAreaObjectPolygonDraftActive(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      areaObjectPolygonDialog.snapshotObject.encounterActive,
    );
    const encounterPlayerOnly = materializeAreaObjectPolygonDraftPlayerOnly(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      areaObjectPolygonDialog.snapshotObject.encounterPlayerOnly,
    );
    const encounterReset = materializeAreaObjectPolygonDraftReset(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      areaObjectPolygonDialog.snapshotObject.encounterReset,
    );
    const encounterResetTime = materializeAreaObjectPolygonDraftResetTime(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      areaObjectPolygonDialog.snapshotObject.encounterResetTime,
    );
    const encounterSpawnOption = materializeAreaObjectPolygonDraftSpawnOption(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      areaObjectPolygonDialog.snapshotObject.encounterSpawnOption,
    );
    const encounterRespawns = materializeAreaObjectPolygonDraftRespawns(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      areaObjectPolygonDialog.snapshotObject.encounterRespawns,
    );
    const encounterCreatureCounts =
      materializeAreaObjectPolygonDraftCreatureCounts(
        areaObjectPolygonDialog.draft,
        areaObjectPolygonDialog.snapshotObject.source,
        areaObjectPolygonDialog.snapshotObject.encounterCreatureCounts,
      );
    const encounterScriptResRefs = materializeAreaObjectPolygonDraftScriptResRefs(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      areaObjectPolygonDialog.snapshotObject.encounterScriptResRefs,
    );
    const encounterScriptResRefsChanged = encounterScriptResRefs !== undefined
      && !encounterScriptResRefsStoragesEqual(
        encounterScriptResRefs,
        areaObjectPolygonDialog.snapshotObject.encounterScriptResRefs,
      );
    const triggerScriptResRefs =
      materializeAreaObjectPolygonDraftTriggerScriptResRefs(
        areaObjectPolygonDialog.draft,
        areaObjectPolygonDialog.snapshotObject.source,
        areaObjectPolygonDialog.snapshotObject.triggerScriptResRefs,
      );
    const triggerScriptResRefsChanged = triggerScriptResRefs !== undefined
      && !triggerScriptResRefsStoragesEqual(
        triggerScriptResRefs,
        areaObjectPolygonDialog.snapshotObject.triggerScriptResRefs,
      );
    const triggerTransitionStorage =
      materializeAreaObjectPolygonDraftTriggerTransitionStorage(
        areaObjectPolygonDialog.draft,
        areaObjectPolygonDialog.snapshotObject.source,
        areaObjectPolygonDialog.snapshotObject.triggerTransitionStorage,
      );
    const triggerTransitionStorageChanged = triggerTransitionStorage !== undefined
      && !triggerTransitionStoragesEqual(
        triggerTransitionStorage,
        areaObjectPolygonDialog.snapshotObject.triggerTransitionStorage,
      );
    const triggerCoreProperties =
      materializeAreaObjectPolygonDraftTriggerCoreProperties(
        areaObjectPolygonDialog.draft,
        areaObjectPolygonDialog.snapshotObject.source,
        areaObjectPolygonDialog.snapshotObject.triggerCoreProperties,
      );
    const triggerCorePropertiesChanged = triggerCoreProperties !== undefined
      && !triggerCorePropertiesEqual(
        triggerCoreProperties,
        areaObjectPolygonDialog.snapshotObject.triggerCoreProperties,
      );
    const triggerTrapProperties =
      materializeAreaObjectPolygonDraftTriggerTrapProperties(
        areaObjectPolygonDialog.draft,
        areaObjectPolygonDialog.snapshotObject.source,
        areaObjectPolygonDialog.snapshotObject.triggerTrapProperties,
      );
    const triggerTrapPropertiesChanged = triggerTrapProperties !== undefined
      && !triggerTrapPropertiesEqual(
        triggerTrapProperties,
        areaObjectPolygonDialog.snapshotObject.triggerTrapProperties,
      );
    const encounterFactionId = materializeAreaObjectPolygonDraftFaction(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      areaObjectPolygonDialog.snapshotObject.encounterFactionId,
      sceneRef.current?.placeableFactionCatalog,
    );
    const encounterFactionChanged = encounterFactionId !== undefined
      && encounterFactionId
        !== areaObjectPolygonDialog.snapshotObject.encounterFactionId;
    const encounterDifficulty = materializeAreaObjectPolygonDraftDifficulty(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      areaObjectPolygonDialog.snapshotObject.encounterDifficulty,
      sceneRef.current?.encounterDifficultyCatalog,
    );
    const encounterDifficultyChanged = encounterDifficulty !== undefined && (
      encounterDifficulty.difficulty
        !== areaObjectPolygonDialog.snapshotObject.encounterDifficulty?.difficulty ||
      encounterDifficulty.difficultyIndex
        !== areaObjectPolygonDialog.snapshotObject.encounterDifficulty?.difficultyIndex
    );
    const sourceTemplateResRef = areaObjectPolygonDialog.objectKind === "triggers"
      ? areaObjectPolygonDialog.snapshotObject.triggerTemplateResRef
      : areaObjectPolygonDialog.snapshotObject.encounterTemplateResRef;
    const areaObjectTemplateResRef =
      materializeAreaObjectPolygonDraftTemplateResRef(
        areaObjectPolygonDialog.draft,
        areaObjectPolygonDialog.snapshotObject.source,
        sourceTemplateResRef,
      );
    const areaObjectTemplateResRefChanged = areaObjectTemplateResRef !== undefined
      && areaObjectTemplateResRef !== sourceTemplateResRef;
    const sourceLocalizedName = areaObjectPolygonDialog.objectKind === "triggers"
      ? areaObjectPolygonDialog.snapshotObject.triggerLocalizedName
      : areaObjectPolygonDialog.snapshotObject.encounterLocalizedName;
    const areaObjectLocalizedName = materializeAreaObjectPolygonDraftLocalizedName(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      sourceLocalizedName,
    );
    const areaObjectLocalizedNameChanged = areaObjectLocalizedName !== undefined
      && areaObjectLocalizedName !== sourceLocalizedName;
    const sourceEditorComment = areaObjectPolygonDialog.objectKind === "triggers"
      ? areaObjectPolygonDialog.snapshotObject.triggerEditorComment
      : areaObjectPolygonDialog.snapshotObject.encounterProperties?.comments;
    const areaObjectEditorComment = materializeAreaObjectPolygonDraftEditorComment(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      sourceEditorComment,
    );
    const areaObjectEditorCommentChanged = areaObjectEditorComment !== undefined
      && areaObjectEditorComment !== sourceEditorComment;
    const encounterEditorCommentChanged = areaObjectPolygonDialog.objectKind === "encounters"
      && areaObjectEditorCommentChanged;
    const triggerEditorCommentChanged = areaObjectPolygonDialog.objectKind === "triggers"
      && areaObjectEditorCommentChanged;
    const sourceAreaObjectVariables = areaObjectPolygonDialog.objectKind === "triggers"
      ? areaObjectPolygonDialog.snapshotObject.triggerVariables
      : areaObjectPolygonDialog.snapshotObject.encounterProperties?.variables;
    const areaObjectVariables = materializeAreaObjectPolygonDraftVariables(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      sourceAreaObjectVariables,
    );
    const areaObjectVariablesChanged = areaObjectVariables !== undefined && (
      areaObjectPolygonDialog.objectKind === "triggers"
        ? !triggerVariableTargetEntriesEqual(areaObjectVariables, sourceAreaObjectVariables)
        : !encounterVariableTargetEntriesEqual(areaObjectVariables, sourceAreaObjectVariables)
    );
    const encounterVariablesChanged = areaObjectPolygonDialog.objectKind === "encounters"
      && areaObjectVariablesChanged;
    const triggerVariablesChanged = areaObjectPolygonDialog.objectKind === "triggers"
      && areaObjectVariablesChanged;
    const encounterCreatureList = materializeAreaObjectPolygonDraftCreatureList(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      areaObjectPolygonDialog.snapshotObject.encounterProperties?.creatureList,
    );
    const encounterCreatureListChanged = encounterCreatureList !== undefined &&
      !encounterCreatureListTargetEntriesEqual(
        areaObjectPolygonDialog.snapshotObject.encounterProperties?.creatureList,
        encounterCreatureList,
      );
    const encounterSpawnPoints = materializeAreaObjectPolygonDraftSpawnPoints(
      areaObjectPolygonDialog.draft,
      areaObjectPolygonDialog.snapshotObject.source,
      areaObjectPolygonDialog.snapshotObject.encounterProperties?.spawnPoints,
    );
    const encounterSpawnPointsChanged = encounterSpawnPoints !== undefined &&
      !encounterSpawnPointTargetEntriesEqual(
        areaObjectPolygonDialog.snapshotObject.encounterProperties?.spawnPoints,
        encounterSpawnPoints,
      );
    setSceneHistory((current) => {
      const polygonScene = sceneViewportPort.setAreaObjectPolygonGeometryById(
        current.present,
        objectId,
        geometry,
        tag,
        encounterActive,
        encounterPlayerOnly,
        encounterReset,
        encounterResetTime,
        encounterSpawnOption,
        encounterRespawns,
        encounterCreatureCounts,
        encounterScriptResRefsChanged ? encounterScriptResRefs : undefined,
        encounterFactionChanged ? encounterFactionId : undefined,
        encounterDifficultyChanged ? encounterDifficulty : undefined,
        areaObjectPolygonDialog.objectKind === "encounters"
          && areaObjectLocalizedNameChanged
          ? areaObjectLocalizedName
          : undefined,
        encounterEditorCommentChanged ? areaObjectEditorComment : undefined,
        encounterVariablesChanged ? areaObjectVariables : undefined,
        encounterCreatureListChanged ? encounterCreatureList : undefined,
        encounterSpawnPointsChanged ? encounterSpawnPoints : undefined,
      );
      const templateScene = !areaObjectTemplateResRefChanged
        ? polygonScene
        : areaObjectPolygonDialog.objectKind === "triggers"
          ? sceneViewportPort.setExistingTriggerTemplateResRefById(
              polygonScene,
              objectId,
              areaObjectTemplateResRef,
            )
          : sceneViewportPort.setExistingEncounterTemplateResRefById(
              polygonScene,
              objectId,
              areaObjectTemplateResRef,
            );
      const localizedNameScene = areaObjectPolygonDialog.objectKind === "triggers"
        && areaObjectLocalizedNameChanged
        ? sceneViewportPort.setExistingTriggerLocalizedNameById(
            templateScene,
            objectId,
            areaObjectLocalizedName,
          )
        : templateScene;
      const editorCommentScene = triggerEditorCommentChanged
        ? sceneViewportPort.setExistingTriggerEditorCommentById(
            localizedNameScene,
            objectId,
            areaObjectEditorComment,
          )
        : localizedNameScene;
      const scriptScene = triggerScriptResRefsChanged
        ? sceneViewportPort.setExistingTriggerScriptResRefsById(
            editorCommentScene,
            objectId,
            triggerScriptResRefs,
          )
        : editorCommentScene;
      const variableScene = triggerVariablesChanged
        ? sceneViewportPort.setExistingTriggerVariablesById(
            scriptScene,
            objectId,
            areaObjectVariables!,
          )
        : scriptScene;
      const transitionScene = triggerTransitionStorageChanged
        ? sceneViewportPort.setExistingTriggerTransitionStorageById(
            variableScene,
            objectId,
            triggerTransitionStorage,
          )
        : variableScene;
      const coreScene = triggerCorePropertiesChanged
        ? sceneViewportPort.setExistingTriggerCorePropertiesById(
            transitionScene,
            objectId,
            triggerCoreProperties,
          )
        : transitionScene;
      const nextScene = triggerTrapPropertiesChanged
        ? sceneViewportPort.setExistingTriggerTrapPropertiesById(
            coreScene,
            objectId,
            triggerTrapProperties,
          )
        : coreScene;
      return nextScene === current.present
        ? current
        : sceneViewportPort.commitHistory(current, nextScene);
    });
    trackTelemetry("scene.area_object_polygon.apply", {
      userId,
      objectId,
      objectKind: areaObjectPolygonDialog.objectKind,
      pointCount: geometry.points.length,
      tagChanged: tag !== areaObjectPolygonDialog.snapshotObject.tag,
      encounterActiveChanged: encounterActive?.activeByte
        !== areaObjectPolygonDialog.snapshotObject.encounterActive?.activeByte,
      encounterPlayerOnlyChanged: encounterPlayerOnly?.playerOnlyByte
        !== areaObjectPolygonDialog.snapshotObject.encounterPlayerOnly?.playerOnlyByte,
      encounterResetChanged: encounterReset?.resetByte
        !== areaObjectPolygonDialog.snapshotObject.encounterReset?.resetByte,
      encounterResetTimeChanged: encounterResetTime?.resetTime
        !== areaObjectPolygonDialog.snapshotObject.encounterResetTime?.resetTime,
      encounterSpawnOptionChanged: encounterSpawnOption?.spawnOption
        !== areaObjectPolygonDialog.snapshotObject.encounterSpawnOption?.spawnOption,
      encounterRespawnsChanged: encounterRespawns?.respawns
        !== areaObjectPolygonDialog.snapshotObject.encounterRespawns?.respawns,
      encounterCreatureCountsChanged:
        encounterCreatureCounts?.maxCreatures
          !== areaObjectPolygonDialog.snapshotObject.encounterCreatureCounts?.maxCreatures
        || encounterCreatureCounts?.recCreatures
          !== areaObjectPolygonDialog.snapshotObject.encounterCreatureCounts?.recCreatures,
      encounterScriptResRefsChanged,
      triggerScriptResRefsChanged,
      triggerTransitionStorageChanged,
      triggerCorePropertiesChanged,
      triggerTrapPropertiesChanged,
      encounterFactionChanged,
      encounterDifficultyChanged,
      encounterTemplateResRefChanged: areaObjectPolygonDialog.objectKind === "encounters"
        && areaObjectTemplateResRefChanged,
      triggerTemplateResRefChanged: areaObjectPolygonDialog.objectKind === "triggers"
        && areaObjectTemplateResRefChanged,
      encounterLocalizedNameChanged: areaObjectPolygonDialog.objectKind === "encounters"
        && areaObjectLocalizedNameChanged,
      triggerLocalizedNameChanged: areaObjectPolygonDialog.objectKind === "triggers"
        && areaObjectLocalizedNameChanged,
      encounterEditorCommentChanged,
      triggerEditorCommentChanged,
      encounterVariablesChanged,
      triggerVariablesChanged,
      encounterCreatureListChanged,
      encounterSpawnPointsChanged,
      closeAfterApply,
    });
    if (closeAfterApply) setAreaObjectPolygonDialog(null);
  }, [areaObjectPolygonDialog, sceneViewportPort, trackTelemetry, userId]);

  const cancelAreaObjectPolygonDialog = useCallback(() => {
    setAreaObjectPolygonDialog(null);
  }, []);

  const toggleAreaObjectPolygonDialogCollapsed = useCallback(() => {
    setAreaObjectPolygonDialog((current) => current
      ? { ...current, collapsed: !current.collapsed }
      : current);
  }, []);

  const clampWaypointPropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: waypointPropertiesDialogRef.current,
        x,
        y,
        fallbackWidthPx: WAYPOINT_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: WAYPOINT_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect,
      }),
    [],
  );

  const openWaypointPropertiesDialog = useCallback((target: SceneObject) => {
    if (target.kind !== "waypoints") return;
    const draft = buildWaypointPropertiesDraft(target);
    const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
    const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
    const runtime = runtimeRef.current;
    const position = runtime
      ? resolveAnchoredContextMenuPosition(
          runtime,
          target,
          target.id,
          anchorOffsetX,
          anchorOffsetY,
          WAYPOINT_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
          WAYPOINT_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        )
      : clampWaypointPropertiesDialogPosition(
          ADJUST_LOCATION_DIALOG_MARGIN_PX,
          ADJUST_LOCATION_DIALOG_MARGIN_PX,
        );
    setWaypointPropertiesDialog({
      objectId: target.id,
      snapshotObject: cloneSceneObject(target),
      draft,
      windowX: position.x,
      windowY: position.y,
      anchorOffsetX,
      anchorOffsetY,
      collapsed: false,
    });
    trackTelemetry("scene.waypoint_properties.open", {
      userId,
      objectKind: target.kind,
      editable: draft.tagControlState === "ACTIVE_NOW" ||
        draft.templateResRefControlState === "ACTIVE_NOW" ||
        draft.localizedNameControlState === "ACTIVE_NOW" ||
        draft.descriptionControlState === "ACTIVE_NOW" ||
        draft.mapNoteControlState === "ACTIVE_NOW" ||
        draft.appearanceControlState === "ACTIVE_NOW" ||
        draft.variablesControlState === "ACTIVE_NOW" ||
        draft.commentsControlState === "ACTIVE_NOW",
    });
  }, [clampWaypointPropertiesDialogPosition, trackTelemetry, userId]);

  useEffect(() => {
    const revision = ++waypointAppearanceCatalogRequestRevisionRef.current;
    const dialog = waypointPropertiesDialog;
    if (!dialog || !canEditExistingWaypointAppearance(dialog.snapshotObject.source) ||
      !waypointApiPort?.listWaypointAppearanceRows || !waypointAppearanceAccessToken) {
      setWaypointAppearanceCatalogState(dialog
        ? { objectId: dialog.objectId, status: "unavailable", catalog: null }
        : null);
      return;
    }
    setWaypointAppearanceCatalogState({
      objectId: dialog.objectId,
      status: "loading",
      catalog: null,
    });
    void loadExistingWaypointAppearanceCatalog(
      waypointApiPort,
      waypointAppearanceAccessToken,
      dialog.snapshotObject.source,
    ).then((catalog) => {
      if (waypointAppearanceCatalogRequestRevisionRef.current !== revision) return;
      setWaypointAppearanceCatalogState({
        objectId: dialog.objectId,
        status: "ready",
        catalog,
      });
    }).catch(() => {
      if (waypointAppearanceCatalogRequestRevisionRef.current !== revision) return;
      setWaypointAppearanceCatalogState({
        objectId: dialog.objectId,
        status: "error",
        catalog: null,
      });
    });
    return () => {
      if (waypointAppearanceCatalogRequestRevisionRef.current === revision) {
        waypointAppearanceCatalogRequestRevisionRef.current += 1;
      }
    };
  }, [
    waypointApiPort,
    waypointAppearanceAccessToken,
    waypointPropertiesDialog?.objectId,
  ]);

  const updateWaypointPropertiesTag = useCallback((value: string) => {
    setWaypointPropertiesDialog((current) => current
      ? {
          ...current,
          draft: {
            ...current.draft,
            tag: reduceExistingWaypointTag(
              current.snapshotObject.source,
              current.draft.tag,
              value,
            ),
          },
        }
      : current);
  }, []);

  const updateWaypointPropertiesTemplateResRef = useCallback((value: string) => {
    setWaypointPropertiesDialog((current) => current
      ? {
          ...current,
          draft: {
            ...current.draft,
            templateResRef: reduceExistingWaypointTemplateResRef(
              current.snapshotObject.source,
              current.draft.templateResRef,
              value,
            ),
          },
        }
      : current);
  }, []);

  const updateWaypointPropertiesLocalizedName = useCallback((value: string) => {
    setWaypointPropertiesDialog((current) => current
      ? {
          ...current,
          draft: {
            ...current.draft,
            localizedName: reduceExistingWaypointLocalizedName(
              current.snapshotObject.source,
              current.draft.localizedName,
              value,
            ),
          },
        }
      : current);
  }, []);

  const updateWaypointPropertiesDescription = useCallback((value: string) => {
    setWaypointPropertiesDialog((current) => current
      ? {
          ...current,
          draft: {
            ...current.draft,
            description: reduceExistingWaypointDescription(
              current.snapshotObject.source,
              current.draft.description,
              value,
            ),
          },
        }
      : current);
  }, []);

  const updateWaypointPropertiesComments = useCallback((value: string) => {
    setWaypointPropertiesDialog((current) => current
      ? {
          ...current,
          draft: {
            ...current.draft,
            comments: reduceExistingWaypointEditorComment(
              current.snapshotObject.source,
              current.draft.comments,
              value,
            ),
          },
        }
      : current);
  }, []);

  const updateWaypointPropertiesMapNote = useCallback((candidate: Readonly<{
    hasMapNote: boolean;
    mapNoteText: string;
    mapNoteEnabled: boolean;
  }>) => {
    setWaypointPropertiesDialog((current) => {
      if (!current) return current;
      const value = reduceExistingWaypointMapNote(
        current.snapshotObject.source,
        {
          hasMapNote: current.draft.hasMapNote,
          mapNoteText: current.draft.mapNoteText,
          mapNoteEnabled: current.draft.mapNoteEnabled,
        },
        candidate,
      );
      return {
        ...current,
        draft: {
          ...current.draft,
          hasMapNote: value.hasMapNote,
          mapNoteText: value.mapNoteText,
          mapNoteEnabled: value.mapNoteEnabled,
        },
      };
    });
  }, []);

  const updateWaypointPropertiesVariables = useCallback((candidate: readonly AuroraVariableTargetEntry[]) => {
    setWaypointPropertiesDialog((current) => current
      ? {
          ...current,
          draft: {
            ...current.draft,
            variables: reduceExistingWaypointVariables(
              current.snapshotObject.source,
              current.draft.variables,
              candidate,
            ),
          },
        }
      : current);
  }, []);

  const updateWaypointPropertiesAppearance = useCallback((candidate: number) => {
    setWaypointPropertiesDialog((current) => {
      if (!current) return current;
      const catalog = waypointAppearanceCatalogState?.objectId === current.objectId
        ? waypointAppearanceCatalogState.catalog
        : null;
      return {
        ...current,
        draft: {
          ...current.draft,
          appearance: reduceExistingWaypointAppearance(
            current.snapshotObject.source,
            current.draft.appearance,
            candidate,
            catalog,
          ) ?? current.draft.appearance,
        },
      };
    });
  }, [waypointAppearanceCatalogState]);

  const applyWaypointPropertiesDialog = useCallback((closeAfterApply: boolean) => {
    if (!waypointPropertiesDialog || (
      waypointPropertiesDialog.draft.tagControlState !== "ACTIVE_NOW" &&
      waypointPropertiesDialog.draft.templateResRefControlState !== "ACTIVE_NOW" &&
      waypointPropertiesDialog.draft.localizedNameControlState !== "ACTIVE_NOW" &&
      waypointPropertiesDialog.draft.descriptionControlState !== "ACTIVE_NOW" &&
      waypointPropertiesDialog.draft.mapNoteControlState !== "ACTIVE_NOW" &&
      waypointPropertiesDialog.draft.appearanceControlState !== "ACTIVE_NOW" &&
      waypointPropertiesDialog.draft.variablesControlState !== "ACTIVE_NOW" &&
      waypointPropertiesDialog.draft.commentsControlState !== "ACTIVE_NOW"
    )) {
      return;
    }
    const objectId = waypointPropertiesDialog.objectId;
    const materialized = materializeWaypointPropertiesDraft(
      waypointPropertiesDialog.snapshotObject,
      waypointPropertiesDialog.draft,
      waypointAppearanceCatalogState?.objectId === waypointPropertiesDialog.objectId
        ? waypointAppearanceCatalogState.catalog
        : null,
    );
    setSceneHistory((current) => {
      const nextScene = sceneViewportPort.setExistingWaypointPropertiesById(
        current.present,
        objectId,
        {
          tag: materialized.tag,
          templateResRef: materialized.waypointTemplateResRef,
          localizedName: materialized.waypointLocalizedName,
          description: materialized.waypointDescription,
          mapNote: materialized.waypointMapNote,
          appearance: materialized.waypointAppearance,
          waypointVariables: materialized.waypointVariables,
          editorComment: materialized.waypointEditorComment,
        },
      );
      return nextScene === current.present
        ? current
        : sceneViewportPort.commitHistory(current, nextScene);
    });
    trackTelemetry("scene.waypoint_properties.apply", {
      userId,
      objectKind: "waypoints",
      tagChanged: materialized.tag !== waypointPropertiesDialog.snapshotObject.tag,
      templateResRefChanged: materialized.waypointTemplateResRef !==
        waypointPropertiesDialog.snapshotObject.waypointTemplateResRef,
      localizedNameChanged: materialized.waypointLocalizedName !==
        waypointPropertiesDialog.snapshotObject.waypointLocalizedName,
      descriptionChanged: materialized.waypointDescription !==
        waypointPropertiesDialog.snapshotObject.waypointDescription,
      mapNoteChanged: JSON.stringify(materialized.waypointMapNote) !==
        JSON.stringify(waypointPropertiesDialog.snapshotObject.waypointMapNote),
      appearanceChanged: materialized.waypointAppearance !==
        waypointPropertiesDialog.snapshotObject.waypointAppearance,
      variablesChanged: JSON.stringify(materialized.waypointVariables) !==
        JSON.stringify(waypointPropertiesDialog.snapshotObject.waypointVariables),
      commentsChanged: materialized.waypointEditorComment !==
        waypointPropertiesDialog.snapshotObject.waypointEditorComment,
      closeAfterApply,
    });
    if (closeAfterApply) setWaypointPropertiesDialog(null);
  }, [
    sceneViewportPort,
    trackTelemetry,
    userId,
    waypointAppearanceCatalogState,
    waypointPropertiesDialog,
  ]);

  const cancelWaypointPropertiesDialog = useCallback(() => {
    if (waypointPropertiesDialog) {
      const snapshot = waypointPropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const nextScene = sceneViewportPort.setExistingWaypointPropertiesById(
          current.present,
          snapshot.id,
          {
            tag: snapshot.tag,
            templateResRef: snapshot.waypointTemplateResRef,
            localizedName: snapshot.waypointLocalizedName,
            description: snapshot.waypointDescription,
            mapNote: snapshot.waypointMapNote,
            appearance: snapshot.waypointAppearance,
            waypointVariables: snapshot.waypointVariables,
            editorComment: snapshot.waypointEditorComment,
          },
        );
        return nextScene === current.present
          ? current
          : sceneViewportPort.commitHistory(current, nextScene);
      });
      trackTelemetry("scene.waypoint_properties.cancel", {
        userId,
        objectKind: "waypoints",
      });
    }
    setWaypointPropertiesDialog(null);
  }, [sceneViewportPort, trackTelemetry, userId, waypointPropertiesDialog]);

  const toggleWaypointPropertiesDialogCollapsed = useCallback(() => {
    setWaypointPropertiesDialog((current) => current
      ? { ...current, collapsed: !current.collapsed }
      : current);
  }, []);

  const {
    onHeaderPointerDown: startWaypointPropertiesDialogDrag,
    onHeaderPointerMove: moveWaypointPropertiesDialogDrag,
    onHeaderPointerUp: endWaypointPropertiesDialogDrag,
    onHeaderPointerCancel: cancelWaypointPropertiesDialogDrag,
  } = usePropertyDialogDrag({
    dialog: waypointPropertiesDialog,
    setDialog: setWaypointPropertiesDialog,
    hostRef,
    panelRef: waypointPropertiesDialogRef,
    dragRef: waypointPropertiesDialogDragRef,
    clampPosition: clampWaypointPropertiesDialogPosition,
    shouldIgnoreTarget: (target) => Boolean(target?.closest("button, input, select, textarea")),
  });

  const clampStorePropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: storePropertiesDialogRef.current,
        x,
        y,
        fallbackWidthPx: STORE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: STORE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect,
      }),
    [],
  );

  const openStorePropertiesDialog = useCallback((target: SceneObject) => {
    if (target.kind !== "stores") return;
    const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
    const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
    const runtime = runtimeRef.current;
    const position = runtime
      ? resolveAnchoredContextMenuPosition(
          runtime,
          target,
          target.id,
          anchorOffsetX,
          anchorOffsetY,
          STORE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
          STORE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        )
      : clampStorePropertiesDialogPosition(
          ADJUST_LOCATION_DIALOG_MARGIN_PX,
          ADJUST_LOCATION_DIALOG_MARGIN_PX,
        );
    const draft = buildStorePropertiesDraft(
      target,
      sceneRef.current?.itemBaseItemCatalog,
    );
    setStorePropertiesDialog({
      objectId: target.id,
      snapshotObject: cloneSceneObject(target),
      draft,
      windowX: position.x,
      windowY: position.y,
      anchorOffsetX,
      anchorOffsetY,
      collapsed: false,
    });
    trackTelemetry("scene.store_properties.open", {
      userId,
      objectId: target.id,
      commentControlState: draft.commentControlState,
      commerceControlState: draft.commerceControlState,
      scriptControlState: draft.scriptControlState,
      variableControlState: draft.variableControlState,
      restrictionControlState: draft.restrictionControlState,
      inventoryControlState: draft.inventoryControlState,
    });
  }, [clampStorePropertiesDialogPosition, trackTelemetry, userId]);

  const updateStorePropertiesComments = useCallback((comments: string) => {
    setStorePropertiesDialog((current) => current
      ? { ...current, draft: { ...current.draft, comments } }
      : current);
  }, []);

  const updateStorePropertiesCommerce = useCallback((
    commerce: NonNullable<StorePropertiesDraft["commerce"]>,
  ) => {
    setStorePropertiesDialog((current) => current
      ? { ...current, draft: { ...current.draft, commerce } }
      : current);
  }, []);

  const updateStorePropertiesScriptResRefs = useCallback((
    scriptResRefs: NonNullable<StorePropertiesDraft["scriptResRefs"]>,
  ) => {
    setStorePropertiesDialog((current) => current
      ? { ...current, draft: { ...current.draft, scriptResRefs } }
      : current);
  }, []);

  const updateStorePropertiesVariables = useCallback((
    variables: NonNullable<StorePropertiesDraft["variables"]>,
  ) => {
    setStorePropertiesDialog((current) => current
      ? {
          ...current,
          draft: {
            ...current.draft,
            variables: variables.map((entry) => ({ ...entry })),
          },
        }
      : current);
  }, []);

  const updateStorePropertiesRestrictions = useCallback((
    restrictions: NonNullable<StorePropertiesDraft["restrictions"]>,
  ) => {
    setStorePropertiesDialog((current) => current
      ? {
          ...current,
          draft: {
            ...current.draft,
            restrictions: {
              willNotBuy: [...restrictions.willNotBuy],
              willOnlyBuy: [...restrictions.willOnlyBuy],
            },
          },
        }
      : current);
  }, []);

  const updateStorePropertiesInventory = useCallback((
    inventoryBuckets: NonNullable<StorePropertiesDraft["inventoryBuckets"]>,
  ) => {
    setStorePropertiesDialog((current) => current
      ? {
          ...current,
          draft: {
            ...current.draft,
            inventoryBuckets: inventoryBuckets.map((bucket) => ({
              bucketTypeId: bucket.bucketTypeId,
              entries: bucket.entries.map((entry) => ({ ...entry })),
            })),
          },
        }
      : current);
  }, []);

  const applyStorePropertiesDialog = useCallback((closeAfterApply: boolean) => {
    if (!storePropertiesDialog || (
      storePropertiesDialog.draft.commentControlState !== "ACTIVE_NOW" &&
      storePropertiesDialog.draft.commerceControlState !== "ACTIVE_NOW" &&
      storePropertiesDialog.draft.scriptControlState !== "ACTIVE_NOW" &&
      storePropertiesDialog.draft.variableControlState !== "ACTIVE_NOW" &&
      storePropertiesDialog.draft.restrictionControlState !== "ACTIVE_NOW" &&
      storePropertiesDialog.draft.inventoryControlState !== "ACTIVE_NOW"
    )) {
      return;
    }
    const objectId = storePropertiesDialog.objectId;
    const draft = storePropertiesDialog.draft;
    const baselineDraft = buildStorePropertiesDraft(
      storePropertiesDialog.snapshotObject,
      sceneRef.current?.itemBaseItemCatalog,
    );
    const changedFieldCount = (
      draft.commentControlState === "ACTIVE_NOW" &&
      baselineDraft.comments !== draft.comments
        ? 1
        : 0
    ) + (
      draft.commerceControlState === "ACTIVE_NOW" &&
      baselineDraft.commerce !== null &&
      draft.commerce !== null
        ? AREA_STORE_COMMERCE_FIELDS.filter(
            (field) => baselineDraft.commerce?.[field] !== draft.commerce?.[field],
          ).length
        : 0
    ) + (
      draft.scriptControlState === "ACTIVE_NOW" &&
      baselineDraft.scriptResRefs !== null &&
      draft.scriptResRefs !== null
        ? AREA_STORE_SCRIPT_RESREF_FIELDS.filter(
            (field) => baselineDraft.scriptResRefs?.[field.key] !==
              draft.scriptResRefs?.[field.key],
          ).length
        : 0
    ) + (
      draft.variableControlState === "ACTIVE_NOW" &&
      baselineDraft.variables !== null &&
      draft.variables !== null
        ? countChangedStoreVariableEntries(baselineDraft.variables, draft.variables)
        : 0
    ) + (
      draft.restrictionControlState === "ACTIVE_NOW" &&
      baselineDraft.restrictions !== null &&
      draft.restrictions !== null
        ? countChangedStoreRestrictionEntries(
            baselineDraft.restrictions,
            draft.restrictions,
          )
        : 0
    ) + (
      draft.inventoryControlState === "ACTIVE_NOW" &&
      baselineDraft.inventoryBuckets !== null &&
      draft.inventoryBuckets !== null
        ? countChangedStoreInventoryEntries(
            baselineDraft.inventoryBuckets,
            draft.inventoryBuckets,
          )
        : 0
    );
    setSceneHistory((current) => {
      const sourceObject = current.present.objects.find((object) => object.id === objectId);
      if (!sourceObject || sourceObject.kind !== "stores") return current;
      const catalog = current.present.itemBaseItemCatalog;
      const materialized = materializeStorePropertiesDraft(sourceObject, draft, catalog);
      if (areStorePropertiesDraftsEqual(
        buildStorePropertiesDraft(sourceObject, catalog),
        buildStorePropertiesDraft(materialized, catalog),
      )) {
        return current;
      }
      const nextObjects = current.present.objects.map((object) =>
        object.id === objectId ? materialized : object
      );
      return sceneViewportPort.commitHistory(current, {
        ...current.present,
        objects: nextObjects,
      });
    });
    trackTelemetry("scene.store_properties.apply", {
      userId,
      objectId,
      changedFieldCount,
      closeAfterApply,
    });
    if (closeAfterApply) setStorePropertiesDialog(null);
  }, [sceneViewportPort, storePropertiesDialog, trackTelemetry, userId]);

  const cancelStorePropertiesDialog = useCallback(() => {
    if (storePropertiesDialog) {
      const snapshot = storePropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === snapshot.id);
        if (!sourceObject || sourceObject.kind !== "stores" || snapshot.kind !== "stores") {
          return current;
        }
        if (areStorePropertiesDraftsEqual(
          buildStorePropertiesDraft(sourceObject, current.present.itemBaseItemCatalog),
          buildStorePropertiesDraft(snapshot, current.present.itemBaseItemCatalog),
        )) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === snapshot.id ? cloneSceneObject(snapshot) : object
        );
        return sceneViewportPort.commitHistory(current, {
          ...current.present,
          objects: nextObjects,
        });
      });
      trackTelemetry("scene.store_properties.cancel", {
        userId,
        objectId: snapshot.id,
      });
    }
    setStorePropertiesDialog(null);
  }, [sceneViewportPort, storePropertiesDialog, trackTelemetry, userId]);

  const toggleStorePropertiesDialogCollapsed = useCallback(() => {
    setStorePropertiesDialog((current) => current
      ? { ...current, collapsed: !current.collapsed }
      : current);
  }, []);

  const clampPlaceablePropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: placeablePropertiesDialogRef.current,
        x,
        y,
        fallbackWidthPx: PLACEABLE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: PLACEABLE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect
      }),
    []
  );

  const loadPlaceableAppearanceCatalogForDialog = useCallback(
    async (target: SceneObject, query: string, selectedRowIndex?: number) => {
      const requestRevision = ++placeableAppearanceCatalogRequestRevisionRef.current;
      if (!placeableApiPort || !placeableAssetAccessToken) {
        setPlaceableAppearanceCatalogState({
          objectId: target.id,
          status: "unavailable",
          catalog: null
        });
        return;
      }
      setPlaceableAppearanceCatalogState({
        objectId: target.id,
        status: "loading",
        catalog: null
      });
      try {
        const catalog = await loadExistingPlaceableAppearanceCatalog(
          placeableApiPort,
          placeableAssetAccessToken,
          target.source,
          query,
          selectedRowIndex
        );
        if (placeableAppearanceCatalogRequestRevisionRef.current !== requestRevision) return;
        setPlaceableAppearanceCatalogState({
          objectId: target.id,
          status: "ready",
          catalog
        });
      } catch {
        if (placeableAppearanceCatalogRequestRevisionRef.current !== requestRevision) return;
        setPlaceableAppearanceCatalogState({
          objectId: target.id,
          status: "error",
          catalog: null
        });
      }
    },
    [placeableApiPort, placeableAssetAccessToken]
  );

  const openPlaceablePropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "placeables") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            PLACEABLE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            PLACEABLE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampPlaceablePropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      const draft = buildPlaceablePropertiesDraft(target);
      setPlaceablePropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft,
        activeTab: "basic",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      void loadPlaceableAppearanceCatalogForDialog(target, "", draft.appearanceType);
      trackTelemetry("scene.placeable_properties.open", {
        userId,
        objectId: target.id
      });
    },
    [
      clampPlaceablePropertiesDialogPosition,
      cloneSceneObject,
      loadPlaceableAppearanceCatalogForDialog,
      trackTelemetry,
      userId
    ]
  );

  const updatePlaceablePropertiesDraftField = useCallback(
    (
      field:
        | "name"
        | "localizedNameEntries"
        | "tag"
        | "resRef"
        | "appearanceType"
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
        | "descriptionEntries"
        | "comments",
      value:
        | string
        | boolean
        | number
        | NonNullable<PlaceablePropertiesDraft["localizedNameEntries"]>
        | NonNullable<PlaceablePropertiesDraft["descriptionEntries"]>
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const source = current.snapshotObject.source;
        if (field === "localizedNameEntries" || field === "descriptionEntries") {
          if (!Array.isArray(value)) return current;
          const targetField = field === "localizedNameEntries"
            ? "localizedName"
            : "description";
          const draftScalarField = field === "localizedNameEntries" ? "name" : "description";
          const nextEntries = reduceExistingPlaceableLocalizedStringEntries(
            source,
            targetField,
            current.draft[field] ?? [],
            value,
          );
          if (JSON.stringify(nextEntries) === JSON.stringify(current.draft[field] ?? [])) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              [field]: nextEntries,
              [draftScalarField]: nextEntries.find((entry) => entry.languageId === 0)?.text ?? "",
            },
          };
        }
        if (
          field === "isStatic" &&
          !canEditExistingPlaceableBoolean(source, "isStatic")
        ) {
          return current;
        }
        if (
          field === "useable" &&
          !canEditExistingPlaceableBoolean(source, "useable")
        ) {
          return current;
        }
        if (
          (field === "plot" || field === "hasInventory") &&
          !canEditExistingPlaceableBoolean(source, field)
        ) {
          return current;
        }
        if (field === "hitPoints") {
          if (typeof value !== "number") return current;
          const nextValue = reduceExistingPlaceableHitPoints(
            source,
            current.draft.hitPoints,
            value
          );
          if (nextValue === current.draft.hitPoints) return current;
          return {
            ...current,
            draft: { ...current.draft, hitPoints: nextValue }
          };
        }
        if (field === "name" || field === "tag" || field === "resRef") {
          if (typeof value !== "string") {
            return current;
          }
          const nextValue = field === "tag"
            ? reduceExistingPlaceableTag(source, current.draft.tag, value)
            : field === "name"
              ? reduceExistingPlaceableLocalizedString(
                  source,
                  "localizedName",
                  current.draft.name,
                  value
                )
              : reducePlaceableBasicIdentityField(source, current.draft.resRef, value);
          if (nextValue === current.draft[field]) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              [field]: nextValue,
              ...(field === "name" && current.draft.localizedNameEntries
                ? {
                    localizedNameEntries: current.draft.localizedNameEntries.length === 0
                      ? nextValue.length === 0
                        ? []
                        : [{ languageId: 0, text: nextValue }]
                      : current.draft.localizedNameEntries.map((entry) =>
                          entry.languageId === 0 ? { ...entry, text: nextValue } : { ...entry }),
                  }
                : {}),
            }
          };
        }
        if (field === "appearanceType") {
          const catalog =
            placeableAppearanceCatalogState?.objectId === current.objectId &&
            placeableAppearanceCatalogState.status === "ready"
              ? placeableAppearanceCatalogState.catalog
              : null;
          const nextValue = reduceExistingPlaceableAppearance(
            source,
            current.draft.appearanceType,
            value,
            catalog
          );
          if (nextValue === current.draft.appearanceType) return current;
          return {
            ...current,
            draft: { ...current.draft, appearanceType: nextValue }
          };
        }
        if (field === "comments") {
          if (typeof value !== "string") {
            return current;
          }
          const nextValue = reduceExistingPlaceableEditorComment(
            source,
            current.draft.comments,
            value
          );
          if (nextValue === current.draft.comments) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              comments: nextValue
            }
          };
        }
        if (field === "description") {
          if (typeof value !== "string") return current;
          const nextValue = reduceExistingPlaceableLocalizedString(
            source,
            "description",
            current.draft.description,
            value
          );
          if (nextValue === current.draft.description) return current;
          return {
            ...current,
            draft: {
              ...current.draft,
              description: nextValue,
              ...(current.draft.descriptionEntries
                ? {
                    descriptionEntries: current.draft.descriptionEntries.length === 0
                      ? nextValue.length === 0
                        ? []
                        : [{ languageId: 0, text: nextValue }]
                      : current.draft.descriptionEntries.map((entry) =>
                          entry.languageId === 0 ? { ...entry, text: nextValue } : { ...entry }),
                  }
                : {}),
            }
          };
        }
        const durabilitySaveByteField =
          field === "hardness" ||
          field === "fortitudeSave" ||
          field === "reflexSave" ||
          field === "willSave"
            ? field
            : undefined;
        if (durabilitySaveByteField !== undefined) {
          if (typeof value !== "number") {
            return current;
          }
          const nextValue = reduceExistingPlaceableDurabilitySaveByte(
            source,
            durabilitySaveByteField,
            current.draft[durabilitySaveByteField],
            value
          );
          if (nextValue === current.draft[durabilitySaveByteField]) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              [durabilitySaveByteField]: nextValue
            }
          };
        }
        const nextDraft =
          typeof value === "boolean"
            ? { ...current.draft, [field]: value }
            : { ...current.draft, [field]: value };
        if (arePlaceablePropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const updatePlaceableScriptSlotDraftField = useCallback(
    (field: PlaceableScriptSlotKey, value: string) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const source = current.snapshotObject.source;
        if (!canEditExistingPlaceableScriptSlot(source, field)) {
          return current;
        }
        if (current.draft.scriptSlots[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            scriptSlotsEnabled: true,
            scriptSlots: {
              ...current.draft.scriptSlots,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updatePlaceableDisabledFlagDraftField = useCallback(
    (field: keyof PlaceablePropertiesDraft["disabledFlags"], value: boolean) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        if (current.draft.disabledFlags[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            disabledFlags: {
              ...current.draft.disabledFlags,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updatePlaceableLockDraftField = useCallback(
    (
      field: keyof PlaceablePropertiesDraft["lockSettings"],
      value: string | boolean | number
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (
          !current ||
          !canEditExistingPlaceableLockField(current.snapshotObject.source, field) ||
          current.draft.lockSettings[field] === value
        ) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            lockSettings: {
              ...current.draft.lockSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updatePlaceableTrapDraftField = useCallback(
    (
      field: keyof PlaceablePropertiesDraft["trapSettings"],
      value: string | boolean | number
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        if (field === "trapTypeRow") {
          const nextTrapSettings = materializeExistingPlaceableTrapType(
            current.snapshotObject.source,
            current.draft.trapSettings,
            value,
            sceneRef.current?.placeableTrapTypeCatalog,
          );
          if (!nextTrapSettings || nextTrapSettings === current.draft.trapSettings) return current;
          return {
            ...current,
            draft: {
              ...current.draft,
              trapSettings: { ...current.draft.trapSettings, ...nextTrapSettings },
            },
          };
        }
        if (isPlaceableTrapByteField(field)) {
          const currentValue = current.draft.trapSettings[field];
          const nextValue = reduceExistingPlaceableTrapByteField(
            current.snapshotObject.source,
            field,
            currentValue,
            value
          );
          if (nextValue === currentValue) return current;
          return {
            ...current,
            draft: {
              ...current.draft,
              trapSettings: {
                ...current.draft.trapSettings,
                [field]: nextValue
              }
            }
          };
        }
        if (
          (field !== "onDisarmScript" && field !== "onTrapTriggeredScript") ||
          !canEditExistingPlaceableTrapScript(current.snapshotObject.source, field) ||
          current.draft.trapSettings[field] === value
        ) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            trapSettings: {
              ...current.draft.trapSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updatePlaceableAdvancedDraftField = useCallback(
    (
      field: keyof PlaceablePropertiesDraft["advancedSettings"],
      value: string | boolean | number
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current || current.draft.advancedSettings[field] === value) {
          return current;
        }
        if (field === "blueprintResRef") {
          if (typeof value !== "string") {
            return current;
          }
          const nextValue = reduceExistingPlaceableTemplateResRef(
            current.snapshotObject.source,
            current.draft.advancedSettings.blueprintResRef,
            value,
          );
          if (nextValue === current.draft.advancedSettings.blueprintResRef) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: {
                ...current.draft.advancedSettings,
                blueprintResRef: nextValue,
              },
            },
          };
        }
        if (field === "conversation") {
          if (typeof value !== "string") {
            return current;
          }
          const nextValue = reduceExistingPlaceableConversation(
            current.snapshotObject.source,
            current.draft.advancedSettings.conversation,
            value
          );
          if (nextValue === current.draft.advancedSettings.conversation) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: {
                ...current.draft.advancedSettings,
                conversation: nextValue
              }
            }
          };
        }
        if (field === "noInterrupt") {
          if (typeof value !== "boolean") {
            return current;
          }
          const nextValue = reduceExistingPlaceableNoInterrupt(
            current.snapshotObject.source,
            current.draft.advancedSettings.noInterrupt,
            value
          );
          if (nextValue === current.draft.advancedSettings.noInterrupt) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: {
                ...current.draft.advancedSettings,
                noInterrupt: nextValue
              }
            }
          };
        }
        if (field === "initialState") {
          if (typeof value !== "string") {
            return current;
          }
          const nextValue = reduceExistingPlaceableInitialState(
            current.snapshotObject.source,
            current.draft.advancedSettings.initialState,
            value
          );
          if (nextValue === current.draft.advancedSettings.initialState) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: {
                ...current.draft.advancedSettings,
                initialState: nextValue
              }
            }
          };
        }
        if (field === "treasureModelRow") {
          const nextAdvancedSettings = materializeExistingPlaceableBodyBag(
            current.snapshotObject.source,
            current.draft.advancedSettings,
            value,
            sceneRef.current?.placeableBodyBagCatalog,
          );
          if (!nextAdvancedSettings ||
            nextAdvancedSettings.treasureModelRow ===
              current.draft.advancedSettings.treasureModelRow) return current;
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: {
                ...current.draft.advancedSettings,
                treasureModelRow: nextAdvancedSettings.treasureModelRow,
              },
            },
          };
        }
        if (field === "portraitId") {
          const nextAdvancedSettings = materializeExistingPlaceablePortrait(
            current.snapshotObject.source,
            current.draft.advancedSettings,
            value,
            sceneRef.current?.placeablePortraitCatalog,
          );
          if (!nextAdvancedSettings ||
            nextAdvancedSettings.portraitId === current.draft.advancedSettings.portraitId) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: {
                ...current.draft.advancedSettings,
                ...nextAdvancedSettings,
              },
            },
          };
        }
        if (field === "factionId") {
          const nextAdvancedSettings = materializeExistingPlaceableFaction(
            current.snapshotObject.source,
            current.draft.advancedSettings,
            value,
            sceneRef.current?.placeableFactionCatalog,
          );
          if (!nextAdvancedSettings ||
            nextAdvancedSettings.factionId === current.draft.advancedSettings.factionId) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: {
                ...current.draft.advancedSettings,
                ...nextAdvancedSettings,
              },
            },
          };
        }
        return current;
      });
    },
    []
  );

  const addPlaceableInventoryItem = useCallback(() => {
    setPlaceablePropertiesDialog((current) => {
      if (!current || !canEditExistingPlaceableInventory(current.snapshotObject.source)) {
        return current;
      }
      return {
        ...current,
        draft: appendAdmittedPlaceableInventoryItem(current.draft)
      };
    });
  }, []);

  const updatePlaceableInventoryItem = useCallback(
    (
      index: number,
      field: "x" | "y",
      value: number
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (
          !current ||
          !canEditExistingPlaceableInventory(current.snapshotObject.source) ||
          index < 0 ||
          index >= current.draft.inventoryItems.length
        ) {
          return current;
        }
        const draft = updatePlaceableInventoryDraftCoordinate(
          current.draft,
          index,
          field,
          value
        );
        if (draft === current.draft) return current;
        return {
          ...current,
          draft
        };
      });
    },
    [placeableAppearanceCatalogState]
  );

  const movePlaceableInventoryItem = useCallback(
    (index: number, direction: "up" | "down") => {
      setPlaceablePropertiesDialog((current) => {
        if (!current || !canEditExistingPlaceableInventory(current.snapshotObject.source)) {
          return current;
        }
        const draft = movePlaceableInventoryDraftItem(current.draft, index, direction);
        if (draft === current.draft) return current;
        return {
          ...current,
          draft
        };
      });
    },
    []
  );

  const removePlaceableInventoryItem = useCallback((index: number) => {
    setPlaceablePropertiesDialog((current) => {
      if (
        !current ||
        !canEditExistingPlaceableInventory(current.snapshotObject.source) ||
        index < 0 ||
        index >= current.draft.inventoryItems.length
      ) {
        return current;
      }
      const draft = removePlaceableInventoryDraftItem(current.draft, index);
      if (draft === current.draft) return current;
      return {
        ...current,
        draft
      };
    });
  }, []);

  const addPlaceableVariable = useCallback(() => {
    setPlaceablePropertiesDialog((current) => {
      if (!current) return current;
      const variables = appendExistingPlaceableVariable(
        current.snapshotObject.source,
        current.draft.variables,
      );
      return variables === current.draft.variables
        ? current
        : { ...current, draft: { ...current.draft, variables: [...variables] } };
    });
  }, []);

  const updatePlaceableVariable = useCallback((
    index: number,
    entry: PlaceablePropertiesDraft["variables"][number],
  ) => {
    setPlaceablePropertiesDialog((current) => {
      if (!current) return current;
      const variables = updateExistingPlaceableVariable(
        current.snapshotObject.source,
        current.draft.variables,
        index,
        entry,
      );
      return variables === current.draft.variables
        ? current
        : { ...current, draft: { ...current.draft, variables: [...variables] } };
    });
  }, []);

  const movePlaceableVariable = useCallback((index: number, direction: "up" | "down") => {
    setPlaceablePropertiesDialog((current) => {
      if (!current) return current;
      const variables = moveExistingPlaceableVariable(
        current.snapshotObject.source,
        current.draft.variables,
        index,
        direction,
      );
      return variables === current.draft.variables
        ? current
        : { ...current, draft: { ...current.draft, variables: [...variables] } };
    });
  }, []);

  const removePlaceableVariable = useCallback((index: number) => {
    setPlaceablePropertiesDialog((current) => {
      if (!current) return current;
      const variables = removeExistingPlaceableVariable(
        current.snapshotObject.source,
        current.draft.variables,
        index,
      );
      return variables === current.draft.variables
        ? current
        : { ...current, draft: { ...current.draft, variables: [...variables] } };
    });
  }, []);

  const setPlaceablePropertiesActiveTab = useCallback((nextTab: PlaceablePropertiesTab) => {
    setPlaceablePropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const applyPlaceablePropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!placeablePropertiesDialog) {
        return;
      }

      const draft = placeablePropertiesDialog.draft;
      const objectId = placeablePropertiesDialog.objectId;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === objectId);
        if (!sourceObject || sourceObject.kind !== "placeables") {
          return current;
        }
        const sourcePlaceableProperties = sourceObject.placeableProperties;
        const source = sourceObject.source;
        const canEditStatic = canEditExistingPlaceableBoolean(source, "isStatic");
        const canEditUseable = canEditExistingPlaceableBoolean(source, "useable");
        const canEditPlot = canEditExistingPlaceableBoolean(source, "plot");
        const canEditHasInventory = canEditExistingPlaceableBoolean(source, "hasInventory");
        const canEditInventory = canEditExistingPlaceableInventory(source);
        const nextIsStatic = canEditStatic ? draft.isStatic : sourceObject.isStatic ?? true;
        const nextPlot = canEditPlot ? draft.plot : sourcePlaceableProperties?.plot ?? false;
        const nextUseable = canEditUseable
          ? draft.useable
          : sourcePlaceableProperties?.useable ?? false;
        const nextHasInventory = canEditHasInventory
          ? draft.hasInventory
          : sourcePlaceableProperties?.hasInventory ?? false;
        const nextBasicIdentity = materializePlaceableBasicIdentity(sourceObject, draft);
        const nextTag = nextBasicIdentity.tag;
        const nextResRef = nextBasicIdentity.resRef;
        const nextTrapScriptSettings = materializeExistingPlaceableTrapSettings(
          source,
          sourcePlaceableProperties?.trapSettings,
          draft.trapSettings
        );
        const nextTrapByteSettings = materializeExistingPlaceableTrapByteSettings(
          source,
          nextTrapScriptSettings,
          draft.trapSettings
        );
        const nextTrapSettings = materializeExistingPlaceableTrapType(
          source,
          nextTrapByteSettings,
          draft.trapSettings.trapTypeRow,
          current.present.placeableTrapTypeCatalog,
        );
        const nextLockSettings = materializeExistingPlaceableLockSettings(
          source,
          sourcePlaceableProperties?.lockSettings,
          draft.lockSettings
        );
        const nextDurabilitySaveBytes = materializeExistingPlaceableDurabilitySaveBytes(
          source,
          {
            ...(sourcePlaceableProperties?.hardness !== undefined
              ? { hardness: sourcePlaceableProperties.hardness }
              : {}),
            ...(sourcePlaceableProperties?.fortitudeSave !== undefined
              ? { fortitudeSave: sourcePlaceableProperties.fortitudeSave }
              : {}),
            ...(sourcePlaceableProperties?.reflexSave !== undefined
              ? { reflexSave: sourcePlaceableProperties.reflexSave }
              : {}),
            ...(sourcePlaceableProperties?.willSave !== undefined
              ? { willSave: sourcePlaceableProperties.willSave }
              : {})
          },
          draft
        );
        const nextTemplateResRefSettings = materializeExistingPlaceableTemplateResRef(
          source,
          sourcePlaceableProperties?.advancedSettings,
          draft.advancedSettings.blueprintResRef,
        );
        const nextConversationInterruptableSettings =
          materializeExistingPlaceableConversationInterruptable(
            source,
            nextTemplateResRefSettings,
            draft.advancedSettings
          );
        const nextAnimationStateSettings = materializeExistingPlaceableAnimationState(
          source,
          nextConversationInterruptableSettings,
          draft.advancedSettings
        );
        const nextBodyBagSettings = materializeExistingPlaceableBodyBag(
          source,
          nextAnimationStateSettings,
          draft.advancedSettings.treasureModelRow,
          current.present.placeableBodyBagCatalog,
        );
        const nextPortraitSettings = materializeExistingPlaceablePortrait(
          source,
          nextBodyBagSettings,
          draft.advancedSettings.portraitId,
          current.present.placeablePortraitCatalog,
        );
        const nextAdvancedSettings = materializeExistingPlaceableFaction(
          source,
          nextPortraitSettings,
          draft.advancedSettings.factionId,
          current.present.placeableFactionCatalog,
        );
        const nextVariables = materializeExistingPlaceableVariables(
          source,
          sourcePlaceableProperties?.variables,
          draft.variables,
        );
        const nextLongTextProperties = materializeExistingPlaceableComments(
          source,
          sourcePlaceableProperties,
          draft.comments
        );
        const nextLocalizedStrings = materializeExistingPlaceableLocalizedStrings(
          source,
          sourcePlaceableProperties,
          {
            localizedName: draft.name,
            ...(draft.localizedNameEntries
              ? { localizedNameEntries: draft.localizedNameEntries }
              : {}),
            description: draft.description,
            ...(draft.descriptionEntries
              ? { descriptionEntries: draft.descriptionEntries }
              : {}),
          }
        );
        const nextName = nextLocalizedStrings.localizedName ?? nextBasicIdentity.name;
        const nextPlaceableProperties: NonNullable<SceneObject["placeableProperties"]> = {
          plot: nextPlot,
          useable: nextUseable,
          hasInventory: nextHasInventory
        };
        const appearanceCatalog =
          placeableAppearanceCatalogState?.objectId === objectId &&
          placeableAppearanceCatalogState.status === "ready"
            ? placeableAppearanceCatalogState.catalog
            : null;
        const nextAppearanceType = materializeExistingPlaceableAppearance(
          source,
          sourcePlaceableProperties?.appearanceType,
          draft.appearanceType,
          appearanceCatalog
        );
        if (nextAppearanceType !== undefined) {
          nextPlaceableProperties.appearanceType = nextAppearanceType;
        }
        const nextHitPoints = materializeExistingPlaceableHitPoints(
          source,
          sourcePlaceableProperties?.hitPoints,
          draft.hitPoints
        );
        if (nextHitPoints !== undefined) {
          nextPlaceableProperties.hitPoints = nextHitPoints;
        }
        Object.assign(nextPlaceableProperties, nextDurabilitySaveBytes);
        Object.assign(nextPlaceableProperties, nextLongTextProperties);
        Object.assign(nextPlaceableProperties, nextLocalizedStrings);
        if (nextAdvancedSettings) {
          nextPlaceableProperties.advancedSettings = nextAdvancedSettings;
        }
        if (nextLockSettings) {
          nextPlaceableProperties.lockSettings = nextLockSettings;
        }
        if (nextTrapSettings) {
          nextPlaceableProperties.trapSettings = nextTrapSettings;
        }
        const nextScriptSlots = materializeExistingPlaceableScriptSlots(
          source,
          sourcePlaceableProperties?.scriptSlots,
          draft.scriptSlots,
          draft.scriptSlotsEnabled
        );
        if (nextScriptSlots) {
          nextPlaceableProperties.scriptSlots = nextScriptSlots;
        }
        if (draft.disabledFlagsEnabled) {
          nextPlaceableProperties.disabledFlags = { ...draft.disabledFlags };
        }
        if (canEditInventory) {
          nextPlaceableProperties.inventoryItems = draft.inventoryItems.map((entry) => ({
            ...entry
          }));
        } else if (sourcePlaceableProperties?.inventoryItems !== undefined) {
          nextPlaceableProperties.inventoryItems = sourcePlaceableProperties.inventoryItems.map(
            (entry) => ({ ...entry })
          );
        }
        if (nextVariables !== undefined) {
          nextPlaceableProperties.variables = nextVariables;
        }
        const isScriptSlotsUnchanged = nextScriptSlots
          ? sourcePlaceableProperties?.scriptSlots !== undefined &&
            arePlaceableScriptSlotsEqual(sourcePlaceableProperties.scriptSlots, nextScriptSlots)
          : sourcePlaceableProperties?.scriptSlots === undefined;
        const isDisabledFlagsUnchanged = draft.disabledFlagsEnabled
          ? sourcePlaceableProperties?.disabledFlags !== undefined &&
            sourcePlaceableProperties.disabledFlags.plot === draft.disabledFlags.plot &&
            sourcePlaceableProperties.disabledFlags.useable === draft.disabledFlags.useable &&
            sourcePlaceableProperties.disabledFlags.hasInventory === draft.disabledFlags.hasInventory
          : sourcePlaceableProperties?.disabledFlags === undefined;
        const isLockSettingsUnchanged = nextLockSettings
          ? sourcePlaceableProperties?.lockSettings !== undefined &&
            arePlaceableLockSettingsEqual(
              sourcePlaceableProperties.lockSettings,
              nextLockSettings
            )
          : sourcePlaceableProperties?.lockSettings === undefined;
        const isTrapSettingsUnchanged = nextTrapSettings
          ? sourcePlaceableProperties?.trapSettings !== undefined &&
            arePlaceableTrapSettingsEqual(sourcePlaceableProperties.trapSettings, nextTrapSettings)
          : sourcePlaceableProperties?.trapSettings === undefined;
        const isAdvancedSettingsUnchanged = arePlaceableAdvancedSettingsEqual(
          sourcePlaceableProperties?.advancedSettings ?? {},
          nextAdvancedSettings ?? {}
        );
        const isDescriptionUnchanged =
          sourcePlaceableProperties?.description === nextPlaceableProperties.description;
        const isLocalizedNameUnchanged =
          sourcePlaceableProperties?.localizedName === nextPlaceableProperties.localizedName;
        const isCommentsUnchanged =
          sourcePlaceableProperties?.comments === nextPlaceableProperties.comments;
        const isInventoryItemsUnchanged =
          !canEditInventory ||
          stableJsonStringify(sourcePlaceableProperties?.inventoryItems ?? []) ===
            stableJsonStringify(draft.inventoryItems);
        const isVariablesUnchanged =
          stableJsonStringify(sourcePlaceableProperties?.variables) ===
            stableJsonStringify(nextVariables);
        const sourceName = sourceObject.name ?? sourceObject.tag;
        const sourceIsStatic = sourceObject.isStatic ?? true;
        if (
          sourceName === nextName &&
          sourceObject.tag === nextTag &&
          sourceObject.resRef === nextResRef &&
          sourceIsStatic === nextIsStatic &&
          sourcePlaceableProperties?.plot === nextPlot &&
          sourcePlaceableProperties?.useable === nextUseable &&
          sourcePlaceableProperties?.hasInventory === nextHasInventory &&
          sourcePlaceableProperties?.appearanceType === nextPlaceableProperties.appearanceType &&
          sourcePlaceableProperties?.hardness === nextPlaceableProperties.hardness &&
          sourcePlaceableProperties?.hitPoints === nextPlaceableProperties.hitPoints &&
          sourcePlaceableProperties?.fortitudeSave ===
            nextPlaceableProperties.fortitudeSave &&
          sourcePlaceableProperties?.reflexSave === nextPlaceableProperties.reflexSave &&
          sourcePlaceableProperties?.willSave === nextPlaceableProperties.willSave &&
          isScriptSlotsUnchanged &&
          isDisabledFlagsUnchanged &&
          isLockSettingsUnchanged &&
          isTrapSettingsUnchanged &&
          isAdvancedSettingsUnchanged &&
          isInventoryItemsUnchanged &&
          isVariablesUnchanged &&
          isLocalizedNameUnchanged &&
          isDescriptionUnchanged &&
          isCommentsUnchanged
        ) {
          return current;
        }
        const nextScene = sceneViewportPort.setPlaceablePropertiesByIds(
          current.present,
          [objectId],
          {
            name: nextName,
            tag: nextTag,
            resRef: nextResRef,
            isStatic: nextIsStatic,
            placeableProperties: nextPlaceableProperties
          }
        );
        if (nextScene === current.present) {
          return current;
        }
        return sceneViewportPort.commitHistory(current, nextScene);
      });

      trackTelemetry("scene.placeable_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });

      if (closeAfterApply) {
        setPlaceablePropertiesDialog(null);
      }
    },
    [
      placeableAppearanceCatalogState,
      placeablePropertiesDialog,
      sceneViewportPort,
      trackTelemetry,
      userId
    ]
  );

  const cancelPlaceablePropertiesDialog = useCallback(() => {
    if (placeablePropertiesDialog) {
      const snapshot = placeablePropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === snapshot.id);
        if (!sourceObject || sourceObject.kind !== "placeables") {
          return current;
        }
        const sourceDraft = buildPlaceablePropertiesDraft(sourceObject);
        const snapshotDraft = buildPlaceablePropertiesDraft(snapshot);
        if (arePlaceablePropertiesDraftsEqual(sourceDraft, snapshotDraft)) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === snapshot.id ? cloneSceneObject(snapshot) : object
        );
        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });
      trackTelemetry("scene.placeable_properties.cancel", {
        userId,
        objectId: snapshot.id
      });
    }
    setPlaceablePropertiesDialog(null);
  }, [cloneSceneObject, placeablePropertiesDialog, sceneViewportPort, trackTelemetry, userId]);

  const togglePlaceablePropertiesDialogCollapsed = useCallback(() => {
    setPlaceablePropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const mapAnchoredDialogPosition = useCallback(
    function mapAnchoredDialogPosition<TDialogState extends AnchoredDialogPositionState>(
      current: TDialogState,
      nextPosition: { x: number; y: number }
    ): TDialogState {
      const runtime = runtimeRef.current;
      const targetObject = resolveAnchoredDialogDragTargetObject({
        objectId: current.objectId,
        sceneObjects: scene.objects,
        visibleObjectIdsSet
      });
      if (!runtime || !targetObject) {
        return {
          ...current,
          windowX: nextPosition.x,
          windowY: nextPosition.y
        };
      }
      const anchorScreen = resolveContextMenuAnchorScreen(
        runtime,
        targetObject,
        current.objectId
      );
      return {
        ...current,
        windowX: nextPosition.x,
        windowY: nextPosition.y,
        anchorOffsetX: nextPosition.x - anchorScreen.x,
        anchorOffsetY: nextPosition.y - anchorScreen.y
      };
    },
    [scene.objects, visibleObjectIdsSet]
  );

  const {
    onHeaderPointerDown: startAreaObjectPolygonDialogDrag,
    onHeaderPointerMove: moveAreaObjectPolygonDialogDrag,
    onHeaderPointerUp: endAreaObjectPolygonDialogDrag,
    onHeaderPointerCancel: cancelAreaObjectPolygonDialogDrag
  } = usePropertyDialogDrag({
    dialog: areaObjectPolygonDialog,
    setDialog: setAreaObjectPolygonDialog,
    hostRef,
    panelRef: areaObjectPolygonDialogRef,
    dragRef: areaObjectPolygonDialogDragRef,
    clampPosition: clampAreaObjectPolygonDialogPosition,
    shouldIgnoreTarget: (target) => Boolean(target?.closest("button, input, select, textarea")),
    mapPosition: mapAnchoredDialogPosition
  });

  const {
    onHeaderPointerDown: startStorePropertiesDialogDrag,
    onHeaderPointerMove: moveStorePropertiesDialogDrag,
    onHeaderPointerUp: endStorePropertiesDialogDrag,
    onHeaderPointerCancel: cancelStorePropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: storePropertiesDialog,
    setDialog: setStorePropertiesDialog,
    hostRef,
    panelRef: storePropertiesDialogRef,
    dragRef: storePropertiesDialogDragRef,
    clampPosition: clampStorePropertiesDialogPosition,
    shouldIgnoreTarget: (target) => Boolean(target?.closest("button, input, select, textarea")),
    mapPosition: mapAnchoredDialogPosition
  });

  const {
    onHeaderPointerDown: startPlaceablePropertiesDialogDrag,
    onHeaderPointerMove: movePlaceablePropertiesDialogDrag,
    onHeaderPointerUp: endPlaceablePropertiesDialogDrag,
    onHeaderPointerCancel: cancelPlaceablePropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: placeablePropertiesDialog,
    setDialog: setPlaceablePropertiesDialog,
    hostRef,
    panelRef: placeablePropertiesDialogRef,
    dragRef: placeablePropertiesDialogDragRef,
    clampPosition: clampPlaceablePropertiesDialogPosition,
    shouldIgnoreTarget: (target) => Boolean(target?.closest("button, input, select, textarea")),
    mapPosition: mapAnchoredDialogPosition
  });

  const clampSoundPropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: soundPropertiesDialogRef.current,
        x,
        y,
        fallbackWidthPx: SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect
      }),
    []
  );

  const openSoundPropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "sounds") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampSoundPropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      setSoundPropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft: buildSoundPropertiesDraft(target),
        activeTab: "basic",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      trackTelemetry("scene.sound_properties.open", {
        userId,
        objectId: target.id
      });
    },
    [clampSoundPropertiesDialogPosition, cloneSceneObject, trackTelemetry, userId]
  );

  const updateSoundPropertiesDraftField = useCallback(
    (field: keyof SoundPropertiesDraft, value: string | number) => {
      setSoundPropertiesDialog((current) => {
        if (!current) {
          return current;
        }

        let nextDraft = current.draft;
        const soundProfileEditable =
          readAreaSoundProfileStorage(
            current.snapshotObject.source?.soundProfileStorage,
          ) !== null
          && readAreaSoundProfileStorage(current.snapshotObject.soundProfile) !== null;
        if (field === "mode") {
          if (!soundProfileEditable) return current;
          const nextMode = value as SoundPositioningMode;
          nextDraft = {
            ...current.draft,
            mode: nextMode
          };
        } else if (field === "cutoffDistance") {
          const numericValue = parseSoundNumericInput(value);
          if (numericValue === null) {
            return current;
          }
          const nextCutoffDistance = Math.max(0, numericValue);
          nextDraft = {
            ...current.draft,
            cutoffDistance: nextCutoffDistance,
            maxVolumeDistance: soundProfileEditable
              ? Math.min(current.draft.maxVolumeDistance, nextCutoffDistance)
              : deriveMaxVolumeDistanceFromCutoff(nextCutoffDistance)
          };
        } else if (field === "maxVolumeDistance") {
          if (!soundProfileEditable) return current;
          const numericValue = parseSoundNumericInput(value);
          if (numericValue === null) return current;
          nextDraft = {
            ...current.draft,
            maxVolumeDistance: Math.min(
              Math.max(0, numericValue),
              current.draft.cutoffDistance,
            ),
          };
        } else if (
          field === "name" ||
          field === "tag" ||
          field === "resRef" ||
          field === "comments" ||
          field === "timeWindow" ||
          field === "hourMask"
        ) {
          nextDraft = {
            ...current.draft,
            [field]: String(value)
          };
        } else if (
          field === "backendSoundId" ||
          field === "backendCategory" ||
          field === "backendFormat" ||
          field === "backendSpatialMode" ||
          field === "backendPlaybackMode" ||
          field === "flagsSummary" ||
          field === "extraSummary"
        ) {
          return current;
        } else {
          const numericValue = parseSoundNumericInput(value);
          if (numericValue === null) {
            return current;
          }
          nextDraft = {
            ...current.draft,
            [field]: numericValue
          };
        }

        if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const patchSoundPropertiesDraft = useCallback((patch: Partial<SoundPropertiesDraft>) => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const nextDraft = {
        ...current.draft,
        ...patch
      };
      if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }
      return {
        ...current,
        draft: nextDraft
      };
    });
  }, []);

  const toggleSoundPropertiesActive = useCallback(() => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const nextDraft = {
        ...current.draft,
        active: !current.draft.active
      };
      if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }
      return {
        ...current,
        draft: nextDraft
      };
    });
  }, []);

  const setSoundWhenToPlay = useCallback((nextWhenToPlay: SoundWhenToPlay, nextDayNight?: SoundDayNight) => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const nextDraft: SoundPropertiesDraft = {
        ...current.draft,
        whenToPlay: nextWhenToPlay,
        dayNight:
          nextDayNight ?? (nextWhenToPlay === "always" ? "both" : current.draft.dayNight)
      };
      if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }
      return {
        ...current,
        draft: nextDraft
      };
    });
  }, []);

  const toggleSoundHour = useCallback(
    (hourIndex: number) => {
      setSoundPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const currentMaskFlags = parseSoundHourMask(
          current.draft.hourMask,
          current.draft.hoursStart,
          current.draft.hoursEnd
        );
        const safeIndex = clampSoundHourIndex(hourIndex);
        currentMaskFlags[safeIndex] = !currentMaskFlags[safeIndex];
        const bounds = resolveSoundHourBounds(currentMaskFlags);
        const nextDraft: SoundPropertiesDraft = {
          ...current.draft,
          whenToPlay: "hours",
          hourMask: encodeSoundHourMask(currentMaskFlags),
          hoursStart: bounds.start,
          hoursEnd: bounds.end
        };
        if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const selectSoundListEntry = useCallback((index: number) => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const safeIndex =
        current.draft.soundList.length === 0 ? -1 : Math.min(Math.max(index, 0), current.draft.soundList.length - 1);
      if (safeIndex === current.draft.selectedSoundIndex) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          selectedSoundIndex: safeIndex
        }
      };
    });
  }, []);

  const mutateSoundListDraft = useCallback(
    (
      recipe: (list: string[], selectedIndex: number) => { list: string[]; selectedIndex: number }
    ) => {
      setSoundPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        if (
          !(
            readAreaSoundProfileStorage(
              current.snapshotObject.source?.soundProfileStorage,
            ) !== null
            && readAreaSoundProfileStorage(current.snapshotObject.soundProfile) !== null
          )
          && (
            readAreaSoundPlaybackStorage(
              current.snapshotObject.source?.soundPlaybackStorage,
            ) === null
            || readAreaSoundPlaybackStorage(current.snapshotObject.soundPlayback) === null
          )
        ) {
          return current;
        }
        const { list, selectedIndex } = recipe(
          [...current.draft.soundList],
          current.draft.selectedSoundIndex
        );
        const clampedSelectedIndex =
          list.length === 0 ? -1 : Math.min(Math.max(selectedIndex, 0), list.length - 1);
        if (
          list.join("\n") === current.draft.soundList.join("\n") &&
          clampedSelectedIndex === current.draft.selectedSoundIndex
        ) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            soundList: list,
            selectedSoundIndex: clampedSelectedIndex
          }
        };
      });
    },
    []
  );

  const addSoundListEntry = useCallback(() => {
    mutateSoundListDraft((list) => {
      const selectedResRef = soundPropertiesDialog?.draft.catalogSoundResRef ?? "";
      if (
        !isAreaSoundResRef(selectedResRef)
        || !soundCatalogResRefs.includes(selectedResRef)
        || list.length >= MAX_AREA_SOUND_PLAYBACK_LIST_ENTRIES
      ) {
        return { list, selectedIndex: soundPropertiesDialog?.draft.selectedSoundIndex ?? -1 };
      }
      const nextList = [...list, selectedResRef];
      return {
        list: nextList,
        selectedIndex: nextList.length - 1
      };
    });
  }, [mutateSoundListDraft, soundCatalogResRefs, soundPropertiesDialog]);

  const removeSelectedSoundListEntry = useCallback(() => {
    mutateSoundListDraft((list, selectedIndex) => {
      if (list.length === 0 || selectedIndex < 0 || selectedIndex >= list.length) {
        return { list, selectedIndex };
      }
      const nextList = list.filter((_, index) => index !== selectedIndex);
      return {
        list: nextList,
        selectedIndex: Math.min(selectedIndex, nextList.length - 1)
      };
    });
  }, [mutateSoundListDraft]);

  const moveSoundListEntryUp = useCallback(() => {
    mutateSoundListDraft((list, selectedIndex) => {
      if (selectedIndex <= 0 || selectedIndex >= list.length) {
        return { list, selectedIndex };
      }
      const nextList = [...list];
      const previous = nextList[selectedIndex - 1];
      nextList[selectedIndex - 1] = nextList[selectedIndex];
      nextList[selectedIndex] = previous;
      return {
        list: nextList,
        selectedIndex: selectedIndex - 1
      };
    });
  }, [mutateSoundListDraft]);

  const moveSoundListEntryDown = useCallback(() => {
    mutateSoundListDraft((list, selectedIndex) => {
      if (selectedIndex < 0 || selectedIndex >= list.length - 1) {
        return { list, selectedIndex };
      }
      const nextList = [...list];
      const next = nextList[selectedIndex + 1];
      nextList[selectedIndex + 1] = nextList[selectedIndex];
      nextList[selectedIndex] = next;
      return {
        list: nextList,
        selectedIndex: selectedIndex + 1
      };
    });
  }, [mutateSoundListDraft]);

  const setSoundPropertiesActiveTab = useCallback((nextTab: SoundPropertiesTab) => {
    setSoundPropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const applySoundPropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!soundPropertiesDialog) {
        return;
      }

      const draft = soundPropertiesDialog.draft;
      const objectId = soundPropertiesDialog.objectId;
      setSceneHistory((current) => {
        const nextScene = applySoundPropertiesDraftToScene(current.present, objectId, draft);
        if (nextScene === current.present) {
          return current;
        }
        return sceneViewportPort.commitHistory(current, nextScene);
      });

      trackTelemetry("scene.sound_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });

      if (closeAfterApply) {
        setSoundPropertiesDialog(null);
      }
    },
    [sceneViewportPort, soundPropertiesDialog, trackTelemetry, userId]
  );

  const cancelSoundPropertiesDialog = useCallback(() => {
    if (soundPropertiesDialog) {
      const snapshot = soundPropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === snapshot.id);
        if (!sourceObject || sourceObject.kind !== "sounds") {
          return current;
        }
        const snapshotSound = snapshot.soundPositioning;
        const snapshotPreserve = snapshotSound?.preserve;
        const sourcePreserve = sourceObject.soundPositioning?.preserve;
        if (
          sourceObject.name === snapshot.name &&
          sourceObject.tag === snapshot.tag &&
          sourceObject.resRef === snapshot.resRef &&
          sourceObject.soundPositioning?.mode === snapshotSound?.mode &&
          sourceObject.soundPositioning?.elevation === snapshotSound?.elevation &&
          sourceObject.soundPositioning?.maxVolumeDistance === snapshotSound?.maxVolumeDistance &&
          sourceObject.soundPositioning?.cutoffDistance === snapshotSound?.cutoffDistance &&
          sourceObject.soundPositioning?.randomRangeWestEast === snapshotSound?.randomRangeWestEast &&
          sourceObject.soundPositioning?.randomRangeNorthSouth === snapshotSound?.randomRangeNorthSouth &&
          sourcePreserve?.timeWindow === snapshotPreserve?.timeWindow &&
          sourcePreserve?.hourMask === snapshotPreserve?.hourMask &&
          sourcePreserve?.active === snapshotPreserve?.active &&
          sourcePreserve?.whenToPlay === snapshotPreserve?.whenToPlay &&
          sourcePreserve?.dayNight === snapshotPreserve?.dayNight &&
          sourcePreserve?.hoursStart === snapshotPreserve?.hoursStart &&
          sourcePreserve?.hoursEnd === snapshotPreserve?.hoursEnd &&
          sourcePreserve?.playStyle === snapshotPreserve?.playStyle &&
          sourcePreserve?.playOrder === snapshotPreserve?.playOrder &&
          sourcePreserve?.intervalMs === snapshotPreserve?.intervalMs &&
          sourcePreserve?.intervalVariationMs === snapshotPreserve?.intervalVariationMs &&
          sourcePreserve?.volume === snapshotPreserve?.volume &&
          sourcePreserve?.volumeVariation === snapshotPreserve?.volumeVariation &&
          sourcePreserve?.pitchVariation === snapshotPreserve?.pitchVariation &&
          sourcePreserve?.priority === snapshotPreserve?.priority &&
          stableJsonStringify(sourcePreserve?.flags ?? {}) ===
            stableJsonStringify(snapshotPreserve?.flags ?? {}) &&
          stableJsonStringify(sourcePreserve?.extra ?? {}) ===
            stableJsonStringify(snapshotPreserve?.extra ?? {})
        ) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === snapshot.id ? cloneSceneObject(snapshot) : object
        );
        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });
      trackTelemetry("scene.sound_properties.cancel", {
        userId,
        objectId: snapshot.id
      });
    }
    setSoundPropertiesDialog(null);
  }, [cloneSceneObject, sceneViewportPort, soundPropertiesDialog, trackTelemetry, userId]);

  const toggleSoundPropertiesDialogCollapsed = useCallback(() => {
    setSoundPropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startSoundPropertiesDialogDrag,
    onHeaderPointerMove: moveSoundPropertiesDialogDrag,
    onHeaderPointerUp: endSoundPropertiesDialogDrag,
    onHeaderPointerCancel: cancelSoundPropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: soundPropertiesDialog,
    setDialog: setSoundPropertiesDialog,
    hostRef,
    panelRef: soundPropertiesDialogRef,
    dragRef: soundPropertiesDialogDragRef,
    clampPosition: clampSoundPropertiesDialogPosition,
    mapPosition: mapAnchoredDialogPosition
  });

  const clampDoorPropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: doorPropertiesDialogRef.current,
        x,
        y,
        fallbackWidthPx: DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect
      }),
    []
  );

  const openDoorPropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "doors") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampDoorPropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      setDoorPropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft: buildDoorPropertiesDraft(target),
        activeTab: "basic",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      trackTelemetry("scene.door_properties.open", {
        userId,
        objectId: target.id
      });
    },
    [clampDoorPropertiesDialogPosition, cloneSceneObject, trackTelemetry, userId]
  );

  const setDoorPropertiesActiveTab = useCallback((nextTab: DoorPropertiesTab) => {
    setDoorPropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const updateDoorPropertiesDraftField = useCallback(
    (
      field:
        | "name"
        | "tag"
        | "resRef"
        | "appearanceType"
        | "genericAppearance"
        | "plot"
        | "hardness"
        | "hitPoints"
        | "fortitudeSave"
        | "reflexSave"
        | "willSave"
        | "description"
        | "comments",
      value: string | boolean | number
    ) => {
      setDoorPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        if ((current.draft as unknown as Record<string, string | boolean | number>)[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            [field]: value
          }
        };
      });
    },
    []
  );

  const updateDoorLockDraftField = useCallback(
    (field: keyof DoorPropertiesDraft["lockSettings"], value: string | boolean | number) => {
      setDoorPropertiesDialog((current) => {
        if (!current || current.draft.lockSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            lockSettings: {
              ...current.draft.lockSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateDoorTrapDraftField = useCallback(
    (field: keyof DoorPropertiesDraft["trapSettings"], value: string | boolean | number) => {
      setDoorPropertiesDialog((current) => {
        if (!current || current.draft.trapSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            trapSettings: {
              ...current.draft.trapSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateDoorScriptSlotDraftField = useCallback((field: DoorScriptSlotKey, value: string) => {
    setDoorPropertiesDialog((current) => {
      if (!current || current.draft.scriptSlots[field] === value) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          scriptSlots: {
            ...current.draft.scriptSlots,
            [field]: value
          }
        }
      };
    });
  }, []);

  const updateDoorAdvancedDraftField = useCallback(
    (field: keyof DoorPropertiesDraft["advancedSettings"], value: string | boolean) => {
      setDoorPropertiesDialog((current) => {
        if (!current || current.draft.advancedSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            advancedSettings: {
              ...current.draft.advancedSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateDoorTransitionDraftField = useCallback(
    (
      field:
        | "destinationTag"
        | "destinationType"
        | "linkedTarget"
        | "linkedModule"
        | "linkedWaypoint"
        | "loadScreen"
        | "linkedTo"
        | "linkedToFlags"
        | "loadScreenId",
      value: string | number
    ) => {
      setDoorPropertiesDialog((current) => {
        if (!current || current.draft[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            [field]: value
          }
        };
      });
    },
    []
  );

  const applyDoorPropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!doorPropertiesDialog) {
        return;
      }

      const draft = doorPropertiesDialog.draft;
      const objectId = doorPropertiesDialog.objectId;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === objectId);
        if (!sourceObject || sourceObject.kind !== "doors") {
          return current;
        }
        const sourceDraft = buildDoorPropertiesDraft(sourceObject);
        if (areDoorPropertiesDraftsEqual(sourceDraft, draft)) {
          return current;
        }
        const nextName = draft.name.trim();
        const nextTag = draft.tag.trim();
        const nextResRef = draft.resRef.trim();
        const nextDoorProperties: NonNullable<SceneObject["doorProperties"]> = {
          plot: draft.plot,
          hardness: draft.hardness,
          hitPoints: draft.hitPoints,
          fortitudeSave: draft.fortitudeSave,
          reflexSave: draft.reflexSave,
          willSave: draft.willSave,
          appearanceType: draft.appearanceType.trim() || DOOR_APPEARANCE_TYPE_OPTIONS[0]!,
          genericAppearance: draft.genericAppearance.trim() || DOOR_GENERIC_APPEARANCE_OPTIONS[0]!,
          lockSettings: { ...draft.lockSettings },
          trapSettings: { ...draft.trapSettings },
          scriptSlots: { ...draft.scriptSlots },
          advancedSettings: {
            ...draft.advancedSettings,
            blueprintResRef: draft.advancedSettings.blueprintResRef.trim() || nextResRef
          },
          description: draft.description,
          comments: draft.comments
        };

        const sourceStorage = readExistingDoorTransitionStorageProvenance(sourceObject.source);
        const materializedTransition = sourceStorage
          ? materializeExistingDoorTransitionPayload(
              sourceObject.source,
              sourceObject.doorTransition,
              {
              linkedTo: draft.linkedTo,
              linkedToFlags: draft.linkedToFlags,
              loadScreenId: draft.loadScreenId,
              },
            )
          : null;
        if (sourceStorage && !materializedTransition) {
          return current;
        }
        const sourceTransition = sourceObject.doorTransition;
        const nextDoorTransition = materializedTransition ?? (sourceTransition
          ? {
              linkedTarget: sourceTransition.linkedTarget,
              linkedModule: sourceTransition.linkedModule,
              linkedTag: sourceTransition.linkedTag,
              linkedWaypoint: sourceTransition.linkedWaypoint,
              loadScreen: sourceTransition.loadScreen,
              flags: { ...sourceTransition.flags },
              ...(sourceTransition.storage
                ? { storage: { ...sourceTransition.storage } }
                : {}),
              ...(sourceTransition.extra
                ? { extra: { ...sourceTransition.extra } }
                : {})
            }
          : undefined);

        const nextObjects = current.present.objects.map((object) =>
          object.id === objectId
            ? {
                ...object,
                name: nextName,
                tag: nextTag,
                resRef: nextResRef,
                doorProperties: nextDoorProperties,
                doorTransition: nextDoorTransition
              }
            : object
        );
        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });

      trackTelemetry("scene.door_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });

      if (closeAfterApply) {
        setDoorPropertiesDialog(null);
      }
    },
    [doorPropertiesDialog, sceneViewportPort, trackTelemetry, userId]
  );

  const cancelDoorPropertiesDialog = useCallback(() => {
    if (doorPropertiesDialog) {
      trackTelemetry("scene.door_properties.cancel", {
        userId,
        objectId: doorPropertiesDialog.objectId
      });
    }
    setDoorPropertiesDialog(null);
  }, [doorPropertiesDialog, trackTelemetry, userId]);

  const toggleDoorPropertiesDialogCollapsed = useCallback(() => {
    setDoorPropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startDoorPropertiesDialogDrag,
    onHeaderPointerMove: moveDoorPropertiesDialogDrag,
    onHeaderPointerUp: endDoorPropertiesDialogDrag,
    onHeaderPointerCancel: cancelDoorPropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: doorPropertiesDialog,
    setDialog: setDoorPropertiesDialog,
    hostRef,
    panelRef: doorPropertiesDialogRef,
    dragRef: doorPropertiesDialogDragRef,
    clampPosition: clampDoorPropertiesDialogPosition,
    mapPosition: mapAnchoredDialogPosition
  });

  const clampCreaturePropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: creaturePropertiesDialogRef.current,
        x,
        y,
        fallbackWidthPx: CREATURE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: CREATURE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect
      }),
    []
  );

  const loadCreatureAppearanceCatalogForDialog = useCallback(
    async (target: SceneObject, query: string, selectedRowIndex?: number) => {
      const requestRevision = ++creatureAppearanceCatalogRequestRevisionRef.current;
      if (!creatureAppearanceCatalogFacade || !creatureAppearanceAccessToken) {
        setCreatureAppearanceCatalogState({
          objectId: target.id,
          status: "unavailable",
          catalog: null,
          errorMessage: null,
        });
        return;
      }
      setCreatureAppearanceCatalogState({
        objectId: target.id,
        status: "loading",
        catalog: null,
        errorMessage: null,
      });
      try {
        const catalog = await loadExistingCreatureAppearanceCatalog(
          creatureAppearanceCatalogFacade,
          creatureAppearanceAccessToken,
          target.source,
          query,
          selectedRowIndex,
        );
        if (creatureAppearanceCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureAppearanceCatalogState({
          objectId: target.id,
          status: "ready",
          catalog,
          errorMessage: null,
        });
      } catch (error) {
        if (creatureAppearanceCatalogRequestRevisionRef.current !== requestRevision) return;
        const errorMessage = error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Creature Appearance rows are unavailable.";
        setCreatureAppearanceCatalogState({
          objectId: target.id,
          status: "error",
          catalog: null,
          errorMessage,
        });
        trackTelemetry("scene.creature_appearance_catalog.error", {
          userId,
          objectId: target.id,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
    [creatureAppearanceAccessToken, creatureAppearanceCatalogFacade, trackTelemetry, userId],
  );

  const loadCreatureGenderCatalogForDialog = useCallback(
    async (target: SceneObject, query: string, selectedRowIndex?: number) => {
      const requestRevision = ++creatureGenderCatalogRequestRevisionRef.current;
      if (!creatureGenderCatalogFacade || !creatureAppearanceAccessToken) {
        setCreatureGenderCatalogState({
          objectId: target.id,
          status: "unavailable",
          catalog: null,
          errorMessage: null,
        });
        return;
      }
      setCreatureGenderCatalogState({
        objectId: target.id,
        status: "loading",
        catalog: null,
        errorMessage: null,
      });
      try {
        const catalog = await loadExistingCreatureGenderCatalog(
          creatureGenderCatalogFacade,
          creatureAppearanceAccessToken,
          target.source,
          query,
          selectedRowIndex,
        );
        if (creatureGenderCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureGenderCatalogState({
          objectId: target.id,
          status: "ready",
          catalog,
          errorMessage: null,
        });
      } catch (error) {
        if (creatureGenderCatalogRequestRevisionRef.current !== requestRevision) return;
        const errorMessage = error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Creature Gender rows are unavailable.";
        setCreatureGenderCatalogState({
          objectId: target.id,
          status: "error",
          catalog: null,
          errorMessage,
        });
        trackTelemetry("scene.creature_gender_catalog.error", {
          userId,
          objectId: target.id,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
    [creatureAppearanceAccessToken, creatureGenderCatalogFacade, trackTelemetry, userId],
  );

  const loadCreatureAppendageCatalogForDialog = useCallback(
    async (
      target: SceneObject,
      kind: "wings" | "tail",
      query: string,
      selectedRowIndex?: number,
    ) => {
      const revisionRef = kind === "wings"
        ? creatureWingsCatalogRequestRevisionRef
        : creatureTailCatalogRequestRevisionRef;
      const setState = kind === "wings"
        ? setCreatureWingsCatalogState
        : setCreatureTailCatalogState;
      const requestRevision = ++revisionRef.current;
      if (!creatureAppendageCatalogFacade || !creatureAppearanceAccessToken) {
        setState({
          objectId: target.id,
          status: "unavailable",
          catalog: null,
          errorMessage: null,
        });
        return;
      }
      setState({
        objectId: target.id,
        status: "loading",
        catalog: null,
        errorMessage: null,
      });
      try {
        const catalog = await loadExistingCreatureAppendageCatalog(
          creatureAppendageCatalogFacade,
          creatureAppearanceAccessToken,
          target.source,
          kind,
          query,
          selectedRowIndex,
        );
        if (revisionRef.current !== requestRevision) return;
        setState({
          objectId: target.id,
          status: "ready",
          catalog,
          errorMessage: null,
        });
      } catch (error) {
        if (revisionRef.current !== requestRevision) return;
        const errorMessage = error instanceof Error && error.message.trim().length > 0
          ? error.message
          : `Creature ${kind} rows are unavailable.`;
        setState({
          objectId: target.id,
          status: "error",
          catalog: null,
          errorMessage,
        });
        trackTelemetry("scene.creature_appendage_catalog.error", {
          userId,
          objectId: target.id,
          kind,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
    [creatureAppearanceAccessToken, creatureAppendageCatalogFacade, trackTelemetry, userId],
  );

  const loadCreaturePerceptionRangeCatalogForDialog = useCallback(
    async (target: SceneObject, query: string, selectedRowIndex?: number) => {
      const requestRevision = ++creaturePerceptionRangeCatalogRequestRevisionRef.current;
      if (!creaturePerceptionRangeCatalogFacade || !creatureAppearanceAccessToken) {
        setCreaturePerceptionRangeCatalogState({
          objectId: target.id,
          status: "unavailable",
          catalog: null,
          errorMessage: null,
        });
        return;
      }
      setCreaturePerceptionRangeCatalogState({
        objectId: target.id,
        status: "loading",
        catalog: null,
        errorMessage: null,
      });
      try {
        const catalog = await loadExistingCreaturePerceptionRangeCatalog(
          creaturePerceptionRangeCatalogFacade,
          creatureAppearanceAccessToken,
          target.source,
          query,
          selectedRowIndex,
        );
        if (creaturePerceptionRangeCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreaturePerceptionRangeCatalogState({
          objectId: target.id,
          status: "ready",
          catalog,
          errorMessage: null,
        });
      } catch (error) {
        if (creaturePerceptionRangeCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreaturePerceptionRangeCatalogState({
          objectId: target.id,
          status: "error",
          catalog: null,
          errorMessage: error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Creature PerceptionRange rows are unavailable.",
        });
        trackTelemetry("scene.creature_perception_range_catalog.error", {
          userId,
          objectId: target.id,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
    [
      creatureAppearanceAccessToken,
      creaturePerceptionRangeCatalogFacade,
      trackTelemetry,
      userId,
    ],
  );

  const loadCreatureWalkRateCatalogForDialog = useCallback(
    async (target: SceneObject, query: string, selectedRowIndex?: number) => {
      const requestRevision = ++creatureWalkRateCatalogRequestRevisionRef.current;
      if (!creatureWalkRateCatalogFacade || !creatureAppearanceAccessToken) {
        setCreatureWalkRateCatalogState({
          objectId: target.id,
          status: "unavailable",
          catalog: null,
          errorMessage: null,
        });
        return;
      }
      setCreatureWalkRateCatalogState({
        objectId: target.id,
        status: "loading",
        catalog: null,
        errorMessage: null,
      });
      try {
        const catalog = await loadExistingCreatureWalkRateCatalog(
          creatureWalkRateCatalogFacade,
          creatureAppearanceAccessToken,
          target.source,
          query,
          selectedRowIndex,
        );
        if (creatureWalkRateCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureWalkRateCatalogState({
          objectId: target.id,
          status: "ready",
          catalog,
          errorMessage: null,
        });
      } catch (error) {
        if (creatureWalkRateCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureWalkRateCatalogState({
          objectId: target.id,
          status: "error",
          catalog: null,
          errorMessage: error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Creature WalkRate rows are unavailable.",
        });
        trackTelemetry("scene.creature_walk_rate_catalog.error", {
          userId,
          objectId: target.id,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
    [
      creatureAppearanceAccessToken,
      creatureWalkRateCatalogFacade,
      trackTelemetry,
      userId,
    ],
  );

  const loadCreatureSoundSetCatalogForDialog = useCallback(
    async (target: SceneObject, query: string, selectedRowIndex?: number) => {
      const requestRevision = ++creatureSoundSetCatalogRequestRevisionRef.current;
      if (!creatureSoundSetCatalogFacade || !creatureAppearanceAccessToken) {
        setCreatureSoundSetCatalogState({
          objectId: target.id,
          status: "unavailable",
          catalog: null,
          errorMessage: null,
        });
        return;
      }
      setCreatureSoundSetCatalogState({
        objectId: target.id,
        status: "loading",
        catalog: null,
        errorMessage: null,
      });
      try {
        const catalog = await loadExistingCreatureSoundSetCatalog(
          creatureSoundSetCatalogFacade,
          creatureAppearanceAccessToken,
          target.source,
          query,
          selectedRowIndex,
        );
        if (creatureSoundSetCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureSoundSetCatalogState({
          objectId: target.id,
          status: "ready",
          catalog,
          errorMessage: null,
        });
      } catch (error) {
        if (creatureSoundSetCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureSoundSetCatalogState({
          objectId: target.id,
          status: "error",
          catalog: null,
          errorMessage: error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Creature SoundSetFile rows are unavailable.",
        });
        trackTelemetry("scene.creature_sound_set_catalog.error", {
          userId,
          objectId: target.id,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
    [
      creatureAppearanceAccessToken,
      creatureSoundSetCatalogFacade,
      trackTelemetry,
      userId,
    ],
  );

  const loadCreatureClassCatalogForDialog = useCallback(
    async (target: SceneObject, query: string, selectedRowIndices: readonly number[] = []) => {
      const requestRevision = ++creatureClassCatalogRequestRevisionRef.current;
      if (!readExistingCreatureClassIdentityProvenance(target.source) ||
        !creatureClassCatalogFacade || !creatureAppearanceAccessToken) {
        setCreatureClassCatalogState({
          objectId: target.id,
          status: "unavailable",
          catalog: null,
          errorMessage: null,
        });
        return;
      }
      setCreatureClassCatalogState({
        objectId: target.id,
        status: "loading",
        catalog: null,
        errorMessage: null,
      });
      try {
        const catalog = await loadExistingCreatureClassCatalog(
          creatureClassCatalogFacade,
          creatureAppearanceAccessToken,
          target.source,
          query,
          selectedRowIndices,
        );
        if (creatureClassCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureClassCatalogState({
          objectId: target.id,
          status: "ready",
          catalog,
          errorMessage: null,
        });
      } catch (error) {
        if (creatureClassCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureClassCatalogState({
          objectId: target.id,
          status: "error",
          catalog: null,
          errorMessage: error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Creature class rows are unavailable.",
        });
        trackTelemetry("scene.creature_class_identity_catalog.error", {
          userId,
          objectId: target.id,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
    [
      creatureAppearanceAccessToken,
      creatureClassCatalogFacade,
      trackTelemetry,
      userId,
    ],
  );

  const loadCreatureStartingPackageCatalogForDialog = useCallback(
    async (
      target: SceneObject,
      query: string,
      selectedRowIndex?: number,
      targetClassIds?: readonly number[],
    ) => {
      const requestRevision = ++creatureStartingPackageCatalogRequestRevisionRef.current;
      if (!creatureStartingPackageCatalogFacade || !creatureAppearanceAccessToken) {
        setCreatureStartingPackageCatalogState({
          objectId: target.id,
          status: "unavailable",
          catalog: null,
          errorMessage: null,
        });
        return;
      }
      setCreatureStartingPackageCatalogState({
        objectId: target.id,
        status: "loading",
        catalog: null,
        errorMessage: null,
      });
      try {
        const classCatalog = creatureClassCatalogState?.objectId === target.id &&
          creatureClassCatalogState.status === "ready"
          ? creatureClassCatalogState.catalog
          : null;
        const catalog = targetClassIds
          ? await loadCreatureClassIdentityStartingPackageCatalog(
              creatureStartingPackageCatalogFacade,
              creatureAppearanceAccessToken,
              target.source,
              classCatalog,
              targetClassIds,
              query,
              selectedRowIndex,
            )
          : await loadExistingCreatureStartingPackageCatalog(
              creatureStartingPackageCatalogFacade,
              creatureAppearanceAccessToken,
              target.source,
              query,
              selectedRowIndex,
            );
        if (creatureStartingPackageCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureStartingPackageCatalogState({
          objectId: target.id,
          status: "ready",
          catalog,
          errorMessage: null,
        });
      } catch (error) {
        if (creatureStartingPackageCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureStartingPackageCatalogState({
          objectId: target.id,
          status: "error",
          catalog: null,
          errorMessage: error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Creature StartingPackage rows are unavailable.",
        });
        trackTelemetry("scene.creature_starting_package_catalog.error", {
          userId,
          objectId: target.id,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
    [
      creatureAppearanceAccessToken,
      creatureClassCatalogState,
      creatureStartingPackageCatalogFacade,
      trackTelemetry,
      userId,
    ],
  );

  const loadCreatureSkillCatalogForDialog = useCallback(
    async (target: SceneObject) => {
      const requestRevision = ++creatureSkillCatalogRequestRevisionRef.current;
      if (!readExistingCreatureSkillListProvenance(target.source) ||
        !creatureSkillCatalogFacade || !creatureAppearanceAccessToken) {
        setCreatureSkillCatalogState({
          objectId: target.id,
          status: "unavailable",
          catalog: null,
          errorMessage: null,
        });
        return;
      }
      setCreatureSkillCatalogState({
        objectId: target.id,
        status: "loading",
        catalog: null,
        errorMessage: null,
      });
      try {
        const catalog = await loadExistingCreatureSkillCatalog(
          creatureSkillCatalogFacade,
          creatureAppearanceAccessToken,
          target.source,
        );
        if (creatureSkillCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureSkillCatalogState({
          objectId: target.id,
          status: "ready",
          catalog,
          errorMessage: null,
        });
      } catch (error) {
        if (creatureSkillCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureSkillCatalogState({
          objectId: target.id,
          status: "error",
          catalog: null,
          errorMessage: error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Creature SkillList rows are unavailable.",
        });
        trackTelemetry("scene.creature_skill_catalog.error", {
          userId,
          objectId: target.id,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
    [
      creatureAppearanceAccessToken,
      creatureSkillCatalogFacade,
      trackTelemetry,
      userId,
    ],
  );

  const loadCreatureFeatCatalogForDialog = useCallback(
    async (target: SceneObject) => {
      const requestRevision = ++creatureFeatCatalogRequestRevisionRef.current;
      if (!readExistingCreatureFeatListProvenance(target.source) ||
        !creatureFeatCatalogFacade || !creatureAppearanceAccessToken) {
        setCreatureFeatCatalogState({
          objectId: target.id,
          status: "unavailable",
          catalog: null,
          errorMessage: null,
        });
        return;
      }
      setCreatureFeatCatalogState({
        objectId: target.id,
        status: "loading",
        catalog: null,
        errorMessage: null,
      });
      try {
        const catalog = await loadExistingCreatureFeatCatalog(
          creatureFeatCatalogFacade,
          creatureAppearanceAccessToken,
          target.source,
        );
        if (creatureFeatCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureFeatCatalogState({
          objectId: target.id,
          status: "ready",
          catalog,
          errorMessage: null,
        });
      } catch (error) {
        if (creatureFeatCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureFeatCatalogState({
          objectId: target.id,
          status: "error",
          catalog: null,
          errorMessage: error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Creature FeatList rows are unavailable.",
        });
        trackTelemetry("scene.creature_feat_catalog.error", {
          userId,
          objectId: target.id,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
    [
      creatureAppearanceAccessToken,
      creatureFeatCatalogFacade,
      trackTelemetry,
      userId,
    ],
  );

  const loadCreatureSpecialAbilityCatalogForDialog = useCallback(
    async (target: SceneObject) => {
      const requestRevision = ++creatureSpecialAbilityCatalogRequestRevisionRef.current;
      if (!readExistingCreatureSpecialAbilityListProvenance(target.source) ||
        !creatureSpecialAbilityCatalogFacade || !creatureAppearanceAccessToken) {
        setCreatureSpecialAbilityCatalogState({
          objectId: target.id,
          status: "unavailable",
          catalog: null,
          errorMessage: null,
        });
        return;
      }
      setCreatureSpecialAbilityCatalogState({
        objectId: target.id,
        status: "loading",
        catalog: null,
        errorMessage: null,
      });
      try {
        const catalog = await loadExistingCreatureSpecialAbilityCatalog(
          creatureSpecialAbilityCatalogFacade,
          creatureAppearanceAccessToken,
          target.source,
        );
        if (creatureSpecialAbilityCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureSpecialAbilityCatalogState({
          objectId: target.id,
          status: "ready",
          catalog,
          errorMessage: null,
        });
      } catch (error) {
        if (creatureSpecialAbilityCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreatureSpecialAbilityCatalogState({
          objectId: target.id,
          status: "error",
          catalog: null,
          errorMessage: error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Creature SpecAbilityList rows are unavailable.",
        });
        trackTelemetry("scene.creature_special_ability_catalog.error", {
          userId,
          objectId: target.id,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
    [
      creatureAppearanceAccessToken,
      creatureSpecialAbilityCatalogFacade,
      trackTelemetry,
      userId,
    ],
  );

  const loadCreaturePhenotypeCatalogForDialog = useCallback(
    async (target: SceneObject, query: string, selectedRowIndex?: number) => {
      const requestRevision = ++creaturePhenotypeCatalogRequestRevisionRef.current;
      if (!creaturePhenotypeCatalogFacade || !creatureAppearanceAccessToken) {
        setCreaturePhenotypeCatalogState({
          objectId: target.id,
          status: "unavailable",
          catalog: null,
          errorMessage: null,
        });
        return;
      }
      setCreaturePhenotypeCatalogState({
        objectId: target.id,
        status: "loading",
        catalog: null,
        errorMessage: null,
      });
      try {
        const catalog = await loadExistingCreaturePhenotypeCatalog(
          creaturePhenotypeCatalogFacade,
          creatureAppearanceAccessToken,
          target.source,
          query,
          selectedRowIndex,
        );
        if (creaturePhenotypeCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreaturePhenotypeCatalogState({
          objectId: target.id,
          status: "ready",
          catalog,
          errorMessage: null,
        });
      } catch (error) {
        if (creaturePhenotypeCatalogRequestRevisionRef.current !== requestRevision) return;
        setCreaturePhenotypeCatalogState({
          objectId: target.id,
          status: "error",
          catalog: null,
          errorMessage: error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Creature Phenotype rows are unavailable.",
        });
        trackTelemetry("scene.creature_phenotype_catalog.error", {
          userId,
          objectId: target.id,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
    [creatureAppearanceAccessToken, creaturePhenotypeCatalogFacade, trackTelemetry, userId],
  );

  const openCreaturePropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "creatures") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            CREATURE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            CREATURE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampCreaturePropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      const draft = buildCreaturePropertiesDraft(
        target,
        sceneRef.current?.placeableBodyBagCatalog,
        sceneRef.current?.placeableFactionCatalog,
      );
      setCreaturePropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft,
        activeTab: "basic",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      void loadCreatureAppearanceCatalogForDialog(target, "", draft.appearanceType);
      void loadCreatureGenderCatalogForDialog(target, "", draft.genderId);
      const wingsRowIndex = Number(draft.appearanceParts.wings);
      const tailRowIndex = Number(draft.appearanceParts.tail);
      void loadCreatureAppendageCatalogForDialog(
        target,
        "wings",
        "",
        Number.isSafeInteger(wingsRowIndex) ? wingsRowIndex : undefined,
      );
      void loadCreatureAppendageCatalogForDialog(
        target,
        "tail",
        "",
        Number.isSafeInteger(tailRowIndex) ? tailRowIndex : undefined,
      );
      void loadCreaturePerceptionRangeCatalogForDialog(
        target,
        "",
        draft.advancedSettings.perceptionRangeId,
      );
      void loadCreatureWalkRateCatalogForDialog(
        target,
        "",
        draft.advancedSettings.walkRateId,
      );
      void loadCreatureSoundSetCatalogForDialog(
        target,
        "",
        draft.advancedSettings.soundSetFile,
      );
      void loadCreatureStartingPackageCatalogForDialog(
        target,
        "",
        draft.advancedSettings.startingPackageId,
      );
      void loadCreatureClassCatalogForDialog(target, "");
      void loadCreatureSkillCatalogForDialog(target);
      void loadCreatureFeatCatalogForDialog(target);
      void loadCreatureSpecialAbilityCatalogForDialog(target);
      void loadCreaturePhenotypeCatalogForDialog(target, "", draft.phenotypeId);
      setCreatureFeatsFilter(CREATURE_FEAT_FILTER_OPTIONS[0]!);
      setCreatureSpellsLevelFilter(CREATURE_SPELL_LEVEL_FILTER_OPTIONS[0]!);
      setCreatureSpellsMetaMagicFilter(CREATURE_METAMAGIC_FILTER_OPTIONS[0]!);
      setCreatureSpellsClassFilterIndex(0);
      setCreatureSpecialAbilitiesFilter(CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS[0]!);
      trackTelemetry("scene.creature_properties.open", {
        userId,
        objectId: target.id
      });
    },
    [
      clampCreaturePropertiesDialogPosition,
      cloneSceneObject,
      loadCreatureAppearanceCatalogForDialog,
      loadCreatureGenderCatalogForDialog,
      loadCreatureAppendageCatalogForDialog,
      loadCreaturePerceptionRangeCatalogForDialog,
      loadCreatureWalkRateCatalogForDialog,
      loadCreatureSoundSetCatalogForDialog,
      loadCreatureStartingPackageCatalogForDialog,
      loadCreatureClassCatalogForDialog,
      loadCreatureSkillCatalogForDialog,
      loadCreatureFeatCatalogForDialog,
      loadCreatureSpecialAbilityCatalogForDialog,
      loadCreaturePhenotypeCatalogForDialog,
      trackTelemetry,
      userId,
      setCreatureFeatsFilter,
      setCreatureSpellsLevelFilter,
      setCreatureSpellsMetaMagicFilter,
      setCreatureSpellsClassFilterIndex,
      setCreatureSpecialAbilitiesFilter
    ]
  );

  const setCreaturePropertiesActiveTab = useCallback((nextTab: CreaturePropertiesTab) => {
    setCreaturePropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const updateCreaturePropertiesDraftField = useCallback(
    (
      field: keyof CreaturePropertiesDraft,
      value:
        | string
        | number
        | boolean
        | readonly number[]
        | readonly CreatureClassSpellRemovalTarget[]
        | readonly CreatureClassSpellReorder[]
        | NonNullable<CreaturePropertiesDraft["firstNameEntries"]>
        | NonNullable<CreaturePropertiesDraft["lastNameEntries"]>
        | NonNullable<CreaturePropertiesDraft["descriptionEntries"]>,
    ) => {
      setCreaturePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        if (field === "classSpellClearSlotIndices") {
          if (!Array.isArray(value) || value.some((entry) => !Number.isSafeInteger(entry))) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              classSpellClearSlotIndices: [...value] as number[],
            },
          };
        }
        if (field === "classSpellClearConfirmed") {
          if (typeof value !== "boolean") return current;
          return {
            ...current,
            draft: {
              ...current.draft,
              classSpellClearConfirmed: value,
              ...(!value ? { classSpellClearSlotIndices: [] } : {}),
            },
          };
        }
        if (field === "classSpellRemovalTargets") {
          if (!Array.isArray(value) || value.some((entry) =>
            typeof entry !== "object" || entry === null || Array.isArray(entry))) return current;
          return {
            ...current,
            draft: {
              ...current.draft,
              classSpellRemovalTargets: value.map((target) => ({
                ...(target as CreatureClassSpellRemovalTarget),
              })),
            },
          };
        }
        if (field === "classSpellRemovalConfirmed") {
          if (typeof value !== "boolean") return current;
          return {
            ...current,
            draft: {
              ...current.draft,
              classSpellRemovalConfirmed: value,
              ...(!value ? { classSpellRemovalTargets: [] } : {}),
            },
          };
        }
        if (field === "classSpellReorders") {
          if (!Array.isArray(value) || value.some((entry) =>
            typeof entry !== "object" || entry === null || Array.isArray(entry))) return current;
          return {
            ...current,
            draft: {
              ...current.draft,
              classSpellReorders: value.map((reorder) => ({
                ...(reorder as CreatureClassSpellReorder),
                entryOrder: [...(reorder as CreatureClassSpellReorder).entryOrder],
              })),
            },
          };
        }
        if (field === "classSpellReorderConfirmed") {
          if (typeof value !== "boolean") return current;
          return {
            ...current,
            draft: {
              ...current.draft,
              classSpellReorderConfirmed: value,
              ...(!value ? { classSpellReorders: [] } : {}),
            },
          };
        }
        if (
          field === "firstNameEntries" ||
          field === "lastNameEntries" ||
          field === "descriptionEntries"
        ) {
          if (!Array.isArray(value)) return current;
          const targetField = field === "firstNameEntries"
            ? "firstName"
            : field === "lastNameEntries"
              ? "lastName"
              : "description";
          const nextEntries = reduceExistingCreatureNameLocalizedStringEntries(
            current.snapshotObject.source,
            targetField,
            current.draft[field] ?? [],
            value,
          );
          if (JSON.stringify(nextEntries) === JSON.stringify(current.draft[field] ?? [])) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              [field]: nextEntries,
              [targetField]: nextEntries.find((entry) => entry.languageId === 0)?.text ?? "",
            },
          };
        }
        if (field === "portraitId") {
          const nextDraft = reduceExistingCreaturePortrait(
            current.snapshotObject.source,
            current.draft,
            value,
            sceneRef.current?.creaturePortraitCatalog,
          );
          return areCreaturePropertiesDraftsEqual(current.draft, nextDraft)
            ? current
            : { ...current, draft: nextDraft };
        }
        const nextValue = field === "firstName" || field === "lastName" ||
          field === "description"
          ? reduceExistingCreatureNameLocalizedString(
              current.snapshotObject.source,
              field,
              current.draft[field],
              value,
            )
          : field === "conversation"
            ? reduceExistingCreatureConversation(
                current.snapshotObject.source,
                current.draft.conversation,
                value,
              )
            : field === "noInterrupt"
              ? reduceExistingCreatureNoInterrupt(
                  current.snapshotObject.source,
                  current.draft.noInterrupt,
                  value,
                )
              : field === "appearanceType"
                ? reduceExistingCreatureAppearance(
                    current.snapshotObject.source,
                    current.draft.appearanceType,
                    value,
                    creatureAppearanceCatalogState?.objectId === current.objectId &&
                      creatureAppearanceCatalogState.status === "ready"
                      ? creatureAppearanceCatalogState.catalog
                      : null,
                  )
                : field === "genderId"
                  ? reduceExistingCreatureGender(
                      current.snapshotObject.source,
                      current.draft.genderId,
                      value,
                      creatureGenderCatalogState?.objectId === current.objectId &&
                        creatureGenderCatalogState.status === "ready"
                        ? creatureGenderCatalogState.catalog
                      : null,
                    )
                  : field === "phenotypeId"
                    ? reduceExistingCreaturePhenotype(
                        current.snapshotObject.source,
                        current.draft.phenotypeId,
                        value,
                        creaturePhenotypeCatalogState?.objectId === current.objectId &&
                          creaturePhenotypeCatalogState.status === "ready"
                          ? creaturePhenotypeCatalogState.catalog
                          : null,
                      )
                  : field === "alignment"
                    ? reduceExistingCreatureAlignment(
                        current.snapshotObject.source,
                        current.draft.alignment,
                        value,
                      )
                    : field === "challengeRating"
                      ? reduceExistingCreatureChallengeRating(
                          current.snapshotObject.source,
                          current.draft.challengeRating,
                          value,
                        )
                      : field === "strength" ||
                        field === "dexterity" ||
                        field === "constitution" ||
                        field === "intelligence" ||
                        field === "wisdom" ||
                        field === "charisma"
                      ? reduceExistingCreatureAbilityScore(
                          current.snapshotObject.source,
                          field as CreatureAbilityScoreKey,
                          current.draft[field],
                          value,
                        )
                      : field === "naturalArmorClass"
                        ? reduceExistingCreatureNaturalArmorClass(
                            current.snapshotObject.source,
                            current.draft.naturalArmorClass,
                            value,
                          )
                      : field === "fortitudeBonus" ||
                          field === "reflexBonus" ||
                          field === "willBonus"
                        ? reduceExistingCreatureSavingThrowBonus(
                            current.snapshotObject.source,
                            field === "fortitudeBonus"
                              ? "fortitude"
                              : field === "reflexBonus"
                                ? "reflex"
                                : "will",
                            current.draft[field],
                            value,
                          )
                    : field === "comments"
                      ? reduceExistingCreatureEditorComment(
                          current.snapshotObject.source,
                          current.draft.comments,
                          value,
                        )
                      : value;
        const localizedEntryField = field === "firstName"
          ? "firstNameEntries"
          : field === "lastName"
            ? "lastNameEntries"
            : field === "description"
              ? "descriptionEntries"
              : undefined;
        const currentEntries = localizedEntryField
          ? current.draft[localizedEntryField]
          : undefined;
        let nextDraft = {
          ...current.draft,
          [field]: nextValue,
          ...(localizedEntryField && currentEntries && typeof nextValue === "string"
            ? {
                [localizedEntryField]: currentEntries.length === 0
                  ? nextValue.length === 0
                    ? []
                    : [{ languageId: 0, text: nextValue }]
                  : currentEntries.map((entry) => entry.languageId === 0
                    ? { ...entry, text: nextValue }
                    : { ...entry }),
              }
            : {}),
        };
        if ((field === "constitution" || field === "baseHitPoints") &&
          current.snapshotObject.source?.type === "aurora_git") {
          const classLevels = readCreatureHitPointCoupledClassLevels(
            current.snapshotObject,
            current.draft.classEntries,
          );
          const coupled = reduceExistingCreatureHitPointDraft(
            current.snapshotObject.source,
            current.draft,
            {
              baseHitPoints: field === "baseHitPoints"
                ? nextValue
                : current.draft.baseHitPoints,
              constitution: field === "constitution"
                ? nextValue
                : current.draft.constitution,
              ...(classLevels ? { classLevels } : {}),
            },
          );
          if (coupled === current.draft) return current;
          nextDraft = { ...nextDraft, ...coupled };
        }
        if (field === "genderId") {
          const portraitProvenance = readExistingCreaturePortraitProvenance(
            current.snapshotObject.source,
          );
          if (portraitProvenance && nextValue !== portraitProvenance.genderExpectedValue) {
            nextDraft = {
              ...nextDraft,
              portraitId: portraitProvenance.expectedValue,
              portraitResRef: portraitProvenance.sourceBaseResRef,
            };
          }
        }
        if (areCreaturePropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    [creatureAppearanceCatalogState, creatureGenderCatalogState, creaturePhenotypeCatalogState]
  );

  const updateCreatureClassEntry = useCallback(
    (index: number, field: "classId" | "className" | "level", value: string | number) => {
      if (field === "classId" && creaturePropertiesDialog?.snapshotObject.source?.type ===
        "aurora_git") {
        const current = creaturePropertiesDialog;
        const provenance = readExistingCreatureClassIdentityProvenance(
          current.snapshotObject.source,
        );
        const catalog = creatureClassCatalogState?.objectId === current.objectId &&
          creatureClassCatalogState.status === "ready"
          ? creatureClassCatalogState.catalog
          : null;
        const rowIndex = Number(value);
        const row = isExistingCreatureClassCatalogAdmitted(
          current.snapshotObject.source,
          catalog,
        ) && Number.isSafeInteger(rowIndex)
          ? catalog.items.find((candidate) => candidate.rowIndex === rowIndex)
          : undefined;
        if (!provenance || !row || index < 0 || index >= current.draft.classEntries.length ||
          (current.draft.classEntries.length === provenance.sourceClassIds.length
            ? current.draft.classEntries.some((entry, entryIndex) =>
                entry.level !== provenance.sourceLevels[entryIndex])
            : index < provenance.sourceClassIds.length ||
              current.draft.classEntries.some((entry, entryIndex) =>
                entryIndex < provenance.sourceClassIds.length &&
                (entry.classId !== provenance.sourceClassIds[entryIndex] ||
                  entry.level !== provenance.sourceLevels[entryIndex])))) return;
        const nextEntries = current.draft.classEntries.map((entry, entryIndex) =>
          entryIndex === index
            ? { ...entry, classId: row.rowIndex, className: row.displayName }
            : entry
        );
        const targetClassIds = nextEntries.map((entry) => entry.classId);
        if (targetClassIds.some((classId) => !Number.isSafeInteger(classId)) ||
          new Set(targetClassIds).size !== targetClassIds.length) return;
        setCreaturePropertiesDialog({
          ...current,
          draft: {
            ...current.draft,
            classEntries: nextEntries,
            classIdentityDestructiveSpellClearConfirmed: false,
            classSlotResizeDestructiveRemovalConfirmed: false,
            classSpellClearSlotIndices: [],
            classSpellClearConfirmed: false,
            classSpellRemovalTargets: [],
            classSpellRemovalConfirmed: false,
            classSpellReorders: [],
            classSpellReorderConfirmed: false,
          },
        });
        void loadCreatureStartingPackageCatalogForDialog(
          current.snapshotObject,
          "",
          current.draft.advancedSettings.startingPackageId,
          targetClassIds as number[],
        );
        return;
      }
      setCreaturePropertiesDialog((current) => {
        if (!current || index < 0 || index >= current.draft.classEntries.length) {
          return current;
        }
        const nextEntries = current.draft.classEntries.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, [field]: value } : entry
        );
        if (field === "level" && current.snapshotObject.source?.type === "aurora_git") {
          const provenance = readExistingCreatureClassIdentityProvenance(
            current.snapshotObject.source,
          );
          if (provenance && current.draft.classEntries.length !==
            provenance.sourceClassIds.length && index < provenance.sourceClassIds.length) {
            return current;
          }
          const coupled = reduceExistingCreatureHitPointDraft(
            current.snapshotObject.source,
            current.draft,
            {
              baseHitPoints: current.draft.baseHitPoints,
              constitution: current.draft.constitution,
              classLevels: nextEntries.map((entry) => Number(entry.level)),
            },
          );
          if (coupled === current.draft) return current;
          return {
            ...current,
            draft: {
              ...current.draft,
              ...coupled,
              classEntries: nextEntries,
              classSpellClearSlotIndices: [],
              classSpellClearConfirmed: false,
              classSpellRemovalTargets: [],
              classSpellRemovalConfirmed: false,
              classSpellReorders: [],
              classSpellReorderConfirmed: false,
            },
          };
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            classEntries: nextEntries
          }
        };
      });
    },
    []
  );

  const updateCreatureSkillRank = useCallback((index: number, rank: number) => {
    setCreaturePropertiesDialog((current) => {
      if (!current || index < 0 || index >= current.draft.skills.length) {
        return current;
      }
      const source = current.snapshotObject.source;
      const retainedCreature = source?.type === "aurora_git" && source.sourceKind === "creature";
      const catalog = creatureSkillCatalogState?.objectId === current.objectId &&
        creatureSkillCatalogState.status === "ready"
        ? creatureSkillCatalogState.catalog
        : null;
      const skillId = current.draft.skills[index]?.skillId;
      if (retainedCreature &&
        (!isExistingCreatureSkillCatalogAdmitted(source, catalog) ||
          !Number.isSafeInteger(skillId) ||
          !catalog.items.some((row) => row.rowIndex === skillId))) return current;
      const nextSkills = current.draft.skills.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, rank } : entry
      );
      return {
        ...current,
        draft: {
          ...current.draft,
          skills: nextSkills
        }
      };
    });
  }, []);

  const updateCreatureFeatAssigned = useCallback((featId: number, assigned: boolean) => {
    setCreaturePropertiesDialog((current) => {
      if (!current || !Number.isSafeInteger(featId)) return current;
      const source = current.snapshotObject.source;
      const retainedCreature = source?.type === "aurora_git" && source.sourceKind === "creature";
      const catalog = creatureFeatCatalogState?.objectId === current.objectId &&
        creatureFeatCatalogState.status === "ready"
        ? creatureFeatCatalogState.catalog
        : null;
      const currentFeats = retainedCreature
        ? materializeExistingCreatureFeats(
            source,
            current.snapshotObject.creatureProperties?.feats ?? [],
            current.draft.feats,
            catalog,
          )
        : current.draft.feats;
      if (retainedCreature && !isExistingCreatureFeatCatalogAdmitted(source, catalog)) {
        return current;
      }
      if (!currentFeats.some((entry) => entry.featId === featId)) return current;
      const nextFeats = currentFeats.map((entry) =>
        entry.featId === featId ? { ...entry, assigned } : { ...entry });
      let nextDraft = { ...current.draft, feats: nextFeats };
      if (retainedCreature && featId === 40) {
        const classLevels = readCreatureHitPointCoupledClassLevels(
          current.snapshotObject,
          current.draft.classEntries,
        );
        const coupled = reduceExistingCreatureHitPointDraft(source, current.draft, {
          baseHitPoints: current.draft.baseHitPoints,
          constitution: current.draft.constitution,
          ...(classLevels ? { classLevels } : {}),
          featRow40Present: assigned,
        });
        if (coupled === current.draft) return current;
        nextDraft = { ...nextDraft, ...coupled };
      }
      return areCreaturePropertiesDraftsEqual(current.draft, nextDraft)
        ? current
        : { ...current, draft: nextDraft };
    });
  }, [creatureFeatCatalogState]);

  const updateCreatureSpecialAbility = useCallback((
    spellId: number,
    field: "uses" | "casterLevel",
    value: number,
  ) => {
    setCreaturePropertiesDialog((current) => {
      if (!current || !Number.isSafeInteger(spellId) || !Number.isFinite(value)) return current;
      const source = current.snapshotObject.source;
      const retainedCreature = source?.type === "aurora_git" && source.sourceKind === "creature";
      const catalog = creatureSpecialAbilityCatalogState?.objectId === current.objectId &&
        creatureSpecialAbilityCatalogState.status === "ready"
        ? creatureSpecialAbilityCatalogState.catalog
        : null;
      const currentAbilities = retainedCreature
        ? materializeExistingCreatureSpecialAbilities(
            source,
            current.snapshotObject.creatureProperties?.specialAbilities ?? [],
            current.draft.specialAbilities,
            catalog,
          )
        : current.draft.specialAbilities;
      if (retainedCreature &&
        !isExistingCreatureSpecialAbilityCatalogAdmitted(source, catalog)) return current;
      if (!currentAbilities.some((entry) => entry.spellId === spellId)) return current;
      const nextAbilities = currentAbilities.map((entry) => {
        if (entry.spellId !== spellId) return { ...entry };
        return reduceCreatureSpecialAbilityEntry(entry, field, value);
      });
      const nextDraft = { ...current.draft, specialAbilities: nextAbilities };
      return areCreaturePropertiesDraftsEqual(current.draft, nextDraft)
        ? current
        : { ...current, draft: nextDraft };
    });
  }, [creatureSpecialAbilityCatalogState]);

  const updateCreatureScriptSlot = useCallback((field: CreatureScriptSlotKey, value: string) => {
    setCreaturePropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const currentValue = current.draft.scriptSlots[field];
      const nextValue = reduceExistingCreatureScriptResRef(
        current.snapshotObject.source,
        field,
        currentValue,
        value,
      );
      if (currentValue === nextValue) return current;
      return {
        ...current,
        draft: {
          ...current.draft,
          scriptSlots: {
            ...current.draft.scriptSlots,
            [field]: nextValue
          }
        }
      };
    });
  }, []);

  const updateCreatureAppearancePart = useCallback(
    (field: keyof CreaturePropertiesDraft["appearanceParts"], value: string) => {
      setCreaturePropertiesDialog((current) => {
        if (!current) return current;
        const currentValue = current.draft.appearanceParts[field];
        const nextValue = current.snapshotObject.source?.type === "aurora_git"
          ? field === "wings" || field === "tail"
            ? (() => {
                const state = field === "wings"
                  ? creatureWingsCatalogState
                  : creatureTailCatalogState;
                const currentRow = /^(?:0|[1-9]\d*)$/u.test(currentValue)
                  ? Number(currentValue)
                  : undefined;
                const candidateRow = /^(?:0|[1-9]\d*)$/u.test(value)
                  ? Number(value)
                  : undefined;
                const reduced = reduceExistingCreatureAppendage(
                  current.snapshotObject.source,
                  field,
                  currentRow,
                  candidateRow,
                  state?.objectId === current.objectId && state.status === "ready"
                    ? state.catalog
                    : null,
                );
                return reduced === undefined ? currentValue : String(reduced);
              })()
            : reduceExistingCreatureBodyPart(
                current.snapshotObject.source,
                field as CreatureBodyPartKey,
                currentValue,
                value,
              )
          : value;
        if (currentValue === nextValue) return current;
        return {
          ...current,
          draft: {
            ...current.draft,
            appearanceParts: {
              ...current.draft.appearanceParts,
              [field]: nextValue
            }
          }
        };
      });
    },
    [creatureTailCatalogState, creatureWingsCatalogState]
  );

  const updateCreatureAdvancedField = useCallback(
    (
      field: keyof CreaturePropertiesDraft["advancedSettings"],
      value: string | number | boolean
    ) => {
      setCreaturePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const currentValue = current.draft.advancedSettings[field];
        if (field === "blueprintResRef") {
          if (typeof currentValue !== "string") {
            return current;
          }
          const nextValue = reduceExistingCreatureTemplateResRef(
            current.snapshotObject.source,
            currentValue,
            value,
          );
          if (nextValue === currentValue) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: {
                ...current.draft.advancedSettings,
                blueprintResRef: nextValue,
              },
            },
          };
        }
        if (field === "subrace" || field === "deity") {
          if (typeof currentValue !== "string") {
            return current;
          }
          const nextValue = reduceExistingCreatureSpecialIdentityString(
            current.snapshotObject.source,
            field,
            currentValue,
            value,
          );
          if (nextValue === currentValue) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: {
                ...current.draft.advancedSettings,
                [field]: nextValue,
              },
            },
          };
        }
        if (field === "factionId") {
          const nextAdvancedSettings = materializeExistingCreatureFaction(
            current.snapshotObject.source,
            current.draft.advancedSettings,
            value,
            sceneRef.current?.placeableFactionCatalog,
          );
          if (!nextAdvancedSettings || (
            nextAdvancedSettings.factionId === current.draft.advancedSettings.factionId &&
            nextAdvancedSettings.faction === current.draft.advancedSettings.faction
          )) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: nextAdvancedSettings,
            },
          };
        }
        if (field === "perceptionRangeId") {
          const catalog = creaturePerceptionRangeCatalogState?.objectId === current.objectId &&
            creaturePerceptionRangeCatalogState.status === "ready"
            ? creaturePerceptionRangeCatalogState.catalog
            : null;
          const nextValue = reduceExistingCreaturePerceptionRange(
            current.snapshotObject.source,
            typeof currentValue === "number" ? currentValue : undefined,
            value,
            catalog,
          );
          if (nextValue === currentValue) return current;
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: {
                ...current.draft.advancedSettings,
                ...(nextValue === undefined ? {} : { perceptionRangeId: nextValue }),
              },
            },
          };
        }
        if (field === "walkRateId") {
          const catalog = creatureWalkRateCatalogState?.objectId === current.objectId &&
            creatureWalkRateCatalogState.status === "ready"
            ? creatureWalkRateCatalogState.catalog
            : null;
          const nextValue = reduceExistingCreatureWalkRate(
            current.snapshotObject.source,
            typeof currentValue === "number" ? currentValue : undefined,
            value,
            catalog,
          );
          if (nextValue === currentValue) return current;
          const nextMovementRate = resolveCreatureWalkRateDisplayName(
            nextValue,
            catalog,
            current.draft.movementRate,
          );
          return {
            ...current,
            draft: {
              ...current.draft,
              movementRate: nextMovementRate,
              advancedSettings: {
                ...current.draft.advancedSettings,
                ...(nextValue === undefined ? {} : { walkRateId: nextValue }),
              },
            },
          };
        }
        if (field === "soundSetFile" &&
          current.snapshotObject.source?.type === "aurora_git" &&
          current.snapshotObject.source.sourceKind === "creature") {
          const catalog = creatureSoundSetCatalogState?.objectId === current.objectId &&
            creatureSoundSetCatalogState.status === "ready"
            ? creatureSoundSetCatalogState.catalog
            : null;
          const nextValue = reduceExistingCreatureSoundSetFile(
            current.snapshotObject.source,
            typeof currentValue === "number" ? currentValue : undefined,
            value,
            catalog,
          );
          if (nextValue === currentValue) return current;
          const nextSoundSet = resolveCreatureSoundSetDisplayName(
            nextValue,
            catalog,
            current.draft.advancedSettings.soundSet,
          );
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: {
                ...current.draft.advancedSettings,
                soundSet: nextSoundSet,
                ...(nextValue === undefined ? {} : { soundSetFile: nextValue }),
              },
            },
          };
        }
        if (field === "startingPackageId" &&
          current.snapshotObject.source?.type === "aurora_git" &&
          current.snapshotObject.source.sourceKind === "creature") {
          const catalog = creatureStartingPackageCatalogState?.objectId === current.objectId &&
            creatureStartingPackageCatalogState.status === "ready"
            ? creatureStartingPackageCatalogState.catalog
            : null;
          const identityProvenance = readExistingCreatureClassIdentityProvenance(
            current.snapshotObject.source,
          );
          const targetClassIds = current.draft.classEntries.map((entry) => entry.classId);
          const identityChanged = identityProvenance !== null &&
            targetClassIds.length === identityProvenance.sourceClassIds.length &&
            targetClassIds.some((classId, index) =>
              classId !== identityProvenance.sourceClassIds[index]);
          const nextValue = identityChanged && targetClassIds.every((classId) =>
            Number.isSafeInteger(classId))
            ? reduceExistingCreatureClassIdentityStartingPackageId(
                current.snapshotObject.source,
                typeof currentValue === "number" ? currentValue : undefined,
                value,
                targetClassIds as number[],
                catalog,
              )
            : reduceExistingCreatureStartingPackageId(
                current.snapshotObject.source,
                typeof currentValue === "number" ? currentValue : undefined,
                value,
                catalog,
              );
          if (nextValue === currentValue) return current;
          return {
            ...current,
            draft: {
              ...current.draft,
              advancedSettings: {
                ...current.draft.advancedSettings,
                ...(nextValue === undefined ? {} : { startingPackageId: nextValue }),
              },
            },
          };
        }
        const advancedFlag = creatureAdvancedFlagForDraftField(field);
        const nextValue = field === "treasureModelRow"
          ? materializeExistingCreatureBodyBagRow(
              current.snapshotObject.source,
              sceneRef.current?.placeableBodyBagCatalog,
              typeof currentValue === "number" ? currentValue : undefined,
              value,
              current.draft.advancedSettings.leavesLootableCorpse,
            )
          : field === "corpseDecayTimeSeconds"
            ? materializeExistingCreatureDecayTimeSeconds(
                current.snapshotObject.source,
                typeof currentValue === "number" ? currentValue : undefined,
                value,
                current.draft.advancedSettings.leavesLootableCorpse,
              )
            : advancedFlag && typeof currentValue === "boolean"
              ? reduceExistingCreatureAdvancedFlag(
                  current.snapshotObject.source,
                  advancedFlag,
                  currentValue,
                  value,
                )
              : value;
        if (currentValue === nextValue) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            advancedSettings: {
              ...current.draft.advancedSettings,
              [field]: nextValue
            }
          }
        };
      });
    },
    [
      creaturePerceptionRangeCatalogState,
      creatureWalkRateCatalogState,
      creatureSoundSetCatalogState,
      creatureStartingPackageCatalogState,
    ]
  );

  const updateCreatureAppearanceColor = useCallback(
    (field: CreatureAppearanceColorKey, value: string) => {
      setCreaturePropertiesDialog((current) => {
        if (!current) return current;
        const currentValue = current.draft.appearanceColors[field];
        const nextValue = reduceExistingCreatureAppearanceColor(
          current.snapshotObject.source,
          field,
          currentValue,
          value,
        );
        if (currentValue === nextValue) return current;
        return {
          ...current,
          draft: {
            ...current.draft,
            appearanceColors: {
              ...current.draft.appearanceColors,
              [field]: nextValue,
            },
          },
        };
      });
    },
    [],
  );

  const addCreatureVariable = useCallback(() => {
    setCreaturePropertiesDialog((current) => {
      if (!current) return current;
      const variables = appendExistingCreatureVariable(
        current.snapshotObject.source,
        current.draft.variables,
      );
      return variables === current.draft.variables
        ? current
        : { ...current, draft: { ...current.draft, variables: [...variables] } };
    });
  }, []);

  const updateCreatureVariable = useCallback(
    (index: number, entry: CreaturePropertiesDraft["variables"][number]) => {
      setCreaturePropertiesDialog((current) => {
        if (!current) return current;
        const variables = updateExistingCreatureVariable(
          current.snapshotObject.source,
          current.draft.variables,
          index,
          entry,
        );
        return variables === current.draft.variables
          ? current
          : { ...current, draft: { ...current.draft, variables: [...variables] } };
      });
    },
    []
  );

  const removeCreatureVariable = useCallback((index: number) => {
    setCreaturePropertiesDialog((current) => {
      if (!current) return current;
      const variables = removeExistingCreatureVariable(
        current.snapshotObject.source,
        current.draft.variables,
        index,
      );
      return variables === current.draft.variables
        ? current
        : { ...current, draft: { ...current.draft, variables: [...variables] } };
    });
  }, []);

  const moveCreatureVariable = useCallback((index: number, direction: "up" | "down") => {
    setCreaturePropertiesDialog((current) => {
      if (!current) return current;
      const variables = moveExistingCreatureVariable(
        current.snapshotObject.source,
        current.draft.variables,
        index,
        direction,
      );
      return variables === current.draft.variables
        ? current
        : { ...current, draft: { ...current.draft, variables: [...variables] } };
    });
  }, []);

  const addCreatureInventoryItem = useCallback(() => {
    setCreaturePropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        draft: appendAdmittedCreatureInventoryItem(current.draft)
      };
    });
  }, [creatureSkillCatalogState]);

  const updateCreatureInventoryItem = useCallback(
    (
      index: number,
      field: "x" | "y" | "dropable" | "pickpocketable",
      value: number | boolean
    ) => {
      setCreaturePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          draft: updateCreatureInventoryDraftField(current.draft, index, field, value)
        };
      });
    },
    []
  );

  const moveCreatureInventoryItem = useCallback(
    (index: number, direction: "up" | "down") => {
      setCreaturePropertiesDialog((current) =>
        current
          ? {
              ...current,
              draft: moveCreatureInventoryDraftItem(current.draft, index, direction)
            }
          : current
      );
    },
    [
      creatureClassCatalogState,
      creaturePropertiesDialog,
      loadCreatureStartingPackageCatalogForDialog,
    ]
  );

  const removeCreatureInventoryItem = useCallback((index: number) => {
    setCreaturePropertiesDialog((current) => {
      if (!current || index < 0 || index >= current.draft.inventoryItems.length) {
        return current;
      }
      return {
        ...current,
        draft: removeCreatureInventoryDraftItem(current.draft, index)
      };
    });
  }, []);

  const updateCreatureEquipmentItem = useCallback(
    (
      index: number,
      field: "dropable" | "pickpocketable",
      value: boolean
    ) => {
      setCreaturePropertiesDialog((current) =>
        current
          ? {
              ...current,
              draft: updateCreatureEquipmentDraftFlag(current.draft, index, field, value)
            }
          : current
      );
    },
    [creatureClassCatalogState, creaturePropertiesDialog,
      loadCreatureStartingPackageCatalogForDialog]
  );

  const appendCreatureClassSlot = useCallback(() => {
    const current = creaturePropertiesDialog;
    if (!current) return;
    const retainedCreature = current.snapshotObject.source?.type === "aurora_git" &&
      current.snapshotObject.source.sourceKind === "creature";
    const provenance = readExistingCreatureClassIdentityProvenance(
      current.snapshotObject.source,
    );
    const catalog = creatureClassCatalogState?.objectId === current.objectId &&
      creatureClassCatalogState.status === "ready"
      ? creatureClassCatalogState.catalog
      : null;
    if (!retainedCreature) {
      if (current.draft.classEntries.length >= 8) return;
      setCreaturePropertiesDialog({
        ...current,
        draft: {
          ...current.draft,
          classEntries: [
            ...current.draft.classEntries,
            { className: "", level: 1 },
          ],
        },
      });
      return;
    }
    if (!provenance || !isExistingCreatureClassCatalogAdmitted(
      current.snapshotObject.source,
      catalog,
    ) || current.draft.classEntries.length >= 8 ||
      current.draft.classEntries.length < provenance.sourceClassIds.length ||
      current.draft.classEntries.some((entry, index) =>
        index < provenance.sourceClassIds.length &&
        (entry.classId !== provenance.sourceClassIds[index] ||
          entry.level !== provenance.sourceLevels[index]))) return;
    const usedIds = new Set(current.draft.classEntries.map((entry) => entry.classId));
    const row = catalog.items.find((candidate) => !usedIds.has(candidate.rowIndex));
    if (!row) return;
    const nextEntries = [
      ...current.draft.classEntries,
      { classId: row.rowIndex, className: row.displayName, level: 1 },
    ];
    const coupled = reduceExistingCreatureHitPointDraft(
      current.snapshotObject.source,
      current.draft,
      {
        baseHitPoints: current.draft.baseHitPoints,
        constitution: current.draft.constitution,
        classLevels: nextEntries.map((entry) => entry.level),
      },
    );
    if (coupled === current.draft) return;
    setCreaturePropertiesDialog({
      ...current,
      draft: {
        ...current.draft,
        ...coupled,
        classEntries: nextEntries,
        classIdentityDestructiveSpellClearConfirmed: false,
        classSlotResizeDestructiveRemovalConfirmed: false,
        classSpellClearSlotIndices: [],
        classSpellClearConfirmed: false,
        classSpellRemovalTargets: [],
        classSpellRemovalConfirmed: false,
        classSpellReorders: [],
        classSpellReorderConfirmed: false,
      },
    });
    void loadCreatureStartingPackageCatalogForDialog(
      current.snapshotObject,
      "",
      current.draft.advancedSettings.startingPackageId,
      nextEntries.map((entry) => Number(entry.classId)),
    );
  }, [creatureClassCatalogState, creaturePropertiesDialog,
    loadCreatureStartingPackageCatalogForDialog]);

  const truncateCreatureClassSlot = useCallback(() => {
    const current = creaturePropertiesDialog;
    if (!current) return;
    const retainedCreature = current.snapshotObject.source?.type === "aurora_git" &&
      current.snapshotObject.source.sourceKind === "creature";
    const provenance = readExistingCreatureClassIdentityProvenance(
      current.snapshotObject.source,
    );
    const catalog = creatureClassCatalogState?.objectId === current.objectId &&
      creatureClassCatalogState.status === "ready"
      ? creatureClassCatalogState.catalog
      : null;
    if (!retainedCreature) {
      if (current.draft.classEntries.length <= 1) return;
      setCreaturePropertiesDialog({
        ...current,
        draft: {
          ...current.draft,
          classEntries: current.draft.classEntries.slice(0, -1),
        },
      });
      return;
    }
    if (!provenance || !isExistingCreatureClassCatalogAdmitted(
      current.snapshotObject.source,
      catalog,
    ) || current.draft.classEntries.length <= 1 ||
      current.draft.classEntries.some((entry, index) =>
        index < Math.min(current.draft.classEntries.length, provenance.sourceClassIds.length) &&
        (entry.classId !== provenance.sourceClassIds[index] ||
          entry.level !== provenance.sourceLevels[index]))) return;
    const nextEntries = current.draft.classEntries.slice(0, -1);
    const coupled = reduceExistingCreatureHitPointDraft(
      current.snapshotObject.source,
      current.draft,
      {
        baseHitPoints: current.draft.baseHitPoints,
        constitution: current.draft.constitution,
        classLevels: nextEntries.map((entry) => entry.level),
      },
    );
    if (coupled === current.draft) return;
    setCreaturePropertiesDialog({
      ...current,
      draft: {
        ...current.draft,
        ...coupled,
        classEntries: nextEntries,
        classIdentityDestructiveSpellClearConfirmed: false,
        classSlotResizeDestructiveRemovalConfirmed:
          nextEntries.length < provenance.sourceClassIds.length,
        classSpellClearSlotIndices: [],
        classSpellClearConfirmed: false,
        classSpellRemovalTargets: [],
        classSpellRemovalConfirmed: false,
        classSpellReorders: [],
        classSpellReorderConfirmed: false,
      },
    });
    void loadCreatureStartingPackageCatalogForDialog(
      current.snapshotObject,
      "",
      current.draft.advancedSettings.startingPackageId,
      nextEntries.map((entry) => Number(entry.classId)),
    );
  }, [creatureClassCatalogState, creaturePropertiesDialog,
    loadCreatureStartingPackageCatalogForDialog]);

  const removeCreatureEquipmentItem = useCallback((index: number) => {
    setCreaturePropertiesDialog((current) =>
      current
        ? {
            ...current,
            draft: removeCreatureEquipmentDraftItem(current.draft, index)
          }
        : current
    );
  }, []);

  const applyCreaturePropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!creaturePropertiesDialog) {
        return;
      }
      const objectId = creaturePropertiesDialog.objectId;
      const draft = creaturePropertiesDialog.draft;
      let appliedObject: SceneObject | null = null;
      let previousObject: SceneObject | null = null;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === objectId);
        if (!sourceObject || sourceObject.kind !== "creatures") {
          return current;
        }

        const sourceDraft = buildCreaturePropertiesDraft(
          sourceObject,
          current.present.placeableBodyBagCatalog,
          current.present.placeableFactionCatalog,
        );
        if (areCreaturePropertiesDraftsEqual(sourceDraft, draft)) {
          return current;
        }

        const nextTag = materializeExistingCreatureTag(
          sourceObject.source,
          sourceObject.tag,
          draft.tag
        );
        const nextConversation = materializeExistingCreatureConversation(
          sourceObject.source,
          sourceObject.creatureProperties?.conversation ?? "",
          draft.conversation,
        );
        const nextNoInterrupt = materializeExistingCreatureNoInterrupt(
          sourceObject.source,
          sourceObject.creatureProperties?.noInterrupt ?? false,
          draft.noInterrupt,
        );
        const sourceAdvancedSettings = sourceObject.creatureProperties?.advancedSettings;
        const isRetainedCreature = sourceObject.source?.type === "aurora_git" &&
          sourceObject.source.sourceKind === "creature";
        const hasRetainedTemplateResRefProvenance = isRetainedCreature &&
          sourceObject.source?.creatureTemplateResRef !== undefined;
        const nextTemplateResRefAdvancedSettings = hasRetainedTemplateResRefProvenance
          ? materializeExistingCreatureTemplateResRef(
              sourceObject.source,
              sourceAdvancedSettings,
              draft.advancedSettings.blueprintResRef,
            )
          : sourceAdvancedSettings;
        if (hasRetainedTemplateResRefProvenance && !nextTemplateResRefAdvancedSettings) {
          return current;
        }
        const nextSpecialIdentityAdvancedSettings =
          sourceObject.source?.creatureSpecialIdentityStrings !== undefined
            ? materializeExistingCreatureSpecialIdentityStrings(
                sourceObject.source,
                sourceAdvancedSettings,
                {
                  subrace: draft.advancedSettings.subrace,
                  deity: draft.advancedSettings.deity,
                },
              )
            : sourceAdvancedSettings;
        if (
          sourceObject.source?.creatureSpecialIdentityStrings !== undefined &&
          !nextSpecialIdentityAdvancedSettings
        ) {
          return current;
        }
        const hasRetainedFactionProvenance =
          sourceObject.source?.type === "aurora_git" &&
          sourceObject.source.sourceKind === "creature" &&
          sourceObject.source.creatureFaction !== undefined;
        const nextFactionAdvancedSettings = hasRetainedFactionProvenance
          ? materializeExistingCreatureFaction(
              sourceObject.source,
              sourceAdvancedSettings,
              draft.advancedSettings.factionId,
              current.present.placeableFactionCatalog,
            )
          : draft.advancedSettings;
        if (hasRetainedFactionProvenance && !nextFactionAdvancedSettings) {
          return current;
        }
        const nextAdvancedDisarmable = materializeExistingCreatureAdvancedFlag(
          sourceObject.source,
          "disarmable",
          sourceAdvancedSettings?.disarmable ?? false,
          draft.advancedSettings.disarmable,
        );
        const nextAdvancedPlot = materializeExistingCreatureAdvancedFlag(
          sourceObject.source,
          "plot",
          sourceAdvancedSettings?.plot ?? false,
          draft.advancedSettings.plot,
        );
        const nextAdvancedImmortal = materializeExistingCreatureAdvancedFlag(
          sourceObject.source,
          "immortal",
          sourceAdvancedSettings?.immortal ?? false,
          draft.advancedSettings.immortal,
        );
        const nextAdvancedLootable = materializeExistingCreatureAdvancedFlag(
          sourceObject.source,
          "lootable",
          sourceAdvancedSettings?.leavesLootableCorpse ?? false,
          draft.advancedSettings.leavesLootableCorpse,
        );
        const nextAdvancedNoPermanentDeath = materializeExistingCreatureAdvancedFlag(
          sourceObject.source,
          "noPermanentDeath",
          sourceAdvancedSettings?.noPermanentDeath ?? false,
          draft.advancedSettings.noPermanentDeath,
        );
        const nextCreatureBodyBagRow = materializeExistingCreatureBodyBagRow(
          sourceObject.source,
          current.present.placeableBodyBagCatalog,
          sourceAdvancedSettings?.treasureModelRow,
          draft.advancedSettings.treasureModelRow,
          nextAdvancedLootable,
        );
        const nextCreatureDecayTimeSeconds =
          materializeExistingCreatureDecayTimeSeconds(
            sourceObject.source,
            sourceAdvancedSettings?.corpseDecayTimeSeconds,
            draft.advancedSettings.corpseDecayTimeSeconds,
            nextAdvancedLootable,
          );
        const appearanceCatalog =
          creatureAppearanceCatalogState?.objectId === objectId &&
          creatureAppearanceCatalogState.status === "ready"
            ? creatureAppearanceCatalogState.catalog
            : null;
        const nextAppearanceType = materializeExistingCreatureAppearance(
          sourceObject.source,
          sourceObject.creatureProperties?.appearanceType,
          draft.appearanceType,
          appearanceCatalog,
        );
        const genderCatalog =
          creatureGenderCatalogState?.objectId === objectId &&
          creatureGenderCatalogState.status === "ready"
            ? creatureGenderCatalogState.catalog
            : null;
        const nextGenderId = materializeExistingCreatureGender(
          sourceObject.source,
          sourceObject.creatureProperties?.genderId,
          draft.genderId,
          genderCatalog,
        );
        const nextGender = resolveCreatureGenderDisplayName(
          nextGenderId,
          genderCatalog,
          sourceObject.creatureProperties?.gender ?? draft.gender.trim(),
        );
        const perceptionRangeCatalog =
          creaturePerceptionRangeCatalogState?.objectId === objectId &&
          creaturePerceptionRangeCatalogState.status === "ready"
            ? creaturePerceptionRangeCatalogState.catalog
            : null;
        const nextPerceptionRangeId = materializeExistingCreaturePerceptionRange(
          sourceObject.source,
          sourceAdvancedSettings?.perceptionRangeId,
          draft.advancedSettings.perceptionRangeId,
          perceptionRangeCatalog,
        );
        const nextPerceptionRange = resolveCreaturePerceptionRangeDisplayName(
          nextPerceptionRangeId,
          perceptionRangeCatalog,
          sourceAdvancedSettings?.perceptionRange ?? draft.advancedSettings.perceptionRange,
        );
        const walkRateCatalog =
          creatureWalkRateCatalogState?.objectId === objectId &&
          creatureWalkRateCatalogState.status === "ready"
            ? creatureWalkRateCatalogState.catalog
            : null;
        const nextWalkRateId = materializeExistingCreatureWalkRate(
          sourceObject.source,
          sourceAdvancedSettings?.walkRateId,
          draft.advancedSettings.walkRateId,
          walkRateCatalog,
        );
        const nextMovementRate = resolveCreatureWalkRateDisplayName(
          nextWalkRateId,
          walkRateCatalog,
          sourceObject.creatureProperties?.statistics?.movementRate ?? draft.movementRate,
        );
        const soundSetCatalog =
          creatureSoundSetCatalogState?.objectId === objectId &&
          creatureSoundSetCatalogState.status === "ready"
            ? creatureSoundSetCatalogState.catalog
            : null;
        const nextSoundSetFile = isRetainedCreature
          ? materializeExistingCreatureSoundSetFile(
              sourceObject.source,
              sourceAdvancedSettings?.soundSetFile,
              draft.advancedSettings.soundSetFile,
              soundSetCatalog,
            )
          : draft.advancedSettings.soundSetFile;
        const nextSoundSet = isRetainedCreature
          ? resolveCreatureSoundSetDisplayName(
              nextSoundSetFile,
              soundSetCatalog,
              sourceAdvancedSettings?.soundSet ?? draft.advancedSettings.soundSet,
            )
          : draft.advancedSettings.soundSet;
        const startingPackageCatalog =
          creatureStartingPackageCatalogState?.objectId === objectId &&
          creatureStartingPackageCatalogState.status === "ready"
            ? creatureStartingPackageCatalogState.catalog
            : null;
        const regularNextStartingPackageId = isRetainedCreature
          ? materializeExistingCreatureStartingPackageId(
              sourceObject.source,
              sourceAdvancedSettings?.startingPackageId,
              draft.advancedSettings.startingPackageId,
              startingPackageCatalog,
            )
          : draft.advancedSettings.startingPackageId;
        const skillCatalog = creatureSkillCatalogState?.objectId === objectId &&
          creatureSkillCatalogState.status === "ready"
          ? creatureSkillCatalogState.catalog
          : null;
        const nextSkills = isRetainedCreature
          ? materializeExistingCreatureSkills(
              sourceObject.source,
              sourceObject.creatureProperties?.skills ?? [],
              draft.skills,
              skillCatalog,
            )
          : draft.skills;
        const featCatalog = creatureFeatCatalogState?.objectId === objectId &&
          creatureFeatCatalogState.status === "ready"
          ? creatureFeatCatalogState.catalog
          : null;
        const nextFeats = isRetainedCreature
          ? materializeExistingCreatureFeats(
              sourceObject.source,
              sourceObject.creatureProperties?.feats ?? [],
              draft.feats,
              featCatalog,
            )
          : draft.feats;
        const specialAbilityCatalog =
          creatureSpecialAbilityCatalogState?.objectId === objectId &&
          creatureSpecialAbilityCatalogState.status === "ready"
            ? creatureSpecialAbilityCatalogState.catalog
            : null;
        const nextSpecialAbilities = isRetainedCreature
          ? materializeExistingCreatureSpecialAbilities(
              sourceObject.source,
              sourceObject.creatureProperties?.specialAbilities ?? [],
              draft.specialAbilities,
              specialAbilityCatalog,
            )
          : draft.specialAbilities;
        const requestedClassEntries = draft.classEntries
          .filter(
            (entry) => entry.className.trim().length > 0 || typeof entry.classId === "number",
          )
          .map((entry) => ({
            ...(typeof entry.classId === "number"
              ? {
                  classId: isRetainedCreature
                    ? Math.max(0, Math.trunc(entry.classId))
                    : Math.max(0, Math.min(255, Math.trunc(entry.classId))),
                }
              : {}),
            className: entry.className.trim(),
            level: Math.max(1, Math.trunc(entry.level)),
          }));
        const classCatalog = creatureClassCatalogState?.objectId === objectId &&
          creatureClassCatalogState.status === "ready"
          ? creatureClassCatalogState.catalog
          : null;
        const classSlotResize = isRetainedCreature
          ? materializeExistingCreatureClassSlotResize(
              sourceObject.source,
              sourceObject.creatureProperties?.classEntries ?? [],
              requestedClassEntries,
              draft.advancedSettings.startingPackageId,
              draft.classSlotResizeDestructiveRemovalConfirmed,
              classCatalog,
              startingPackageCatalog,
            )
          : null;
        const classIdentity = isRetainedCreature && !classSlotResize
          ? materializeExistingCreatureClassIdentity(
              sourceObject.source,
              sourceObject.creatureProperties?.classEntries ?? [],
              requestedClassEntries,
              draft.advancedSettings.startingPackageId,
              draft.classIdentityDestructiveSpellClearConfirmed,
              classCatalog,
              startingPackageCatalog,
            )
          : null;
        const classSpellClear = isRetainedCreature
          ? materializeExistingCreatureClassSpellClear(
              sourceObject.source,
              requestedClassEntries,
              draft.classSpellClearSlotIndices,
              draft.classSpellClearConfirmed,
            )
          : null;
        const requestedClassSpellMutationCount = Number(
          draft.classSpellClearSlotIndices.length > 0,
        ) + Number(draft.classSpellRemovalTargets.length > 0) +
          Number(draft.classSpellReorders.length > 0);
        if (requestedClassSpellMutationCount > 1) return current;
        if (isRetainedCreature && draft.classSpellClearSlotIndices.length > 0 &&
          !classSpellClear) return current;
        const classSpellRemoval = isRetainedCreature
          ? materializeExistingCreatureClassSpellRemoval(
              sourceObject.source,
              requestedClassEntries,
              draft.classSpellRemovalTargets,
              draft.classSpellRemovalConfirmed,
            )
          : null;
        if (isRetainedCreature && draft.classSpellRemovalTargets.length > 0 &&
          !classSpellRemoval) return current;
        const classSpellReorder = isRetainedCreature
          ? materializeExistingCreatureClassSpellReorder(
              sourceObject.source,
              requestedClassEntries,
              draft.classSpellReorders,
              draft.classSpellReorderConfirmed,
            )
          : null;
        if (isRetainedCreature && draft.classSpellReorders.length > 0 &&
          !classSpellReorder) return current;
        const nextClassEntries = classSlotResize?.classEntries ??
          classIdentity?.classEntries ?? (isRetainedCreature
          ? materializeExistingCreatureClassEntries(
              sourceObject.source,
              sourceObject.creatureProperties?.classEntries ?? [],
              requestedClassEntries,
            )
          : requestedClassEntries);
        const nextStartingPackageId = classSlotResize?.startingPackageId ??
          classIdentity?.startingPackageId ??
          regularNextStartingPackageId;
        const classSpellRemovalProvenance = readExistingCreatureClassSpellRemovalProvenance(
          sourceObject.source,
        );
        const classSpellReorderProvenance = readExistingCreatureClassSpellReorderProvenance(
          sourceObject.source,
        );
        const nextSpells = classSpellClear
          ? draft.spells.filter((entry) => entry.classIndex === undefined ||
              !classSpellClear.classSlotIndices.includes(entry.classIndex))
          : classSpellRemoval && classSpellRemovalProvenance
            ? filterRemovedCreatureClassSpells(
                draft.spells,
                classSpellRemovalProvenance,
                classSpellRemoval.targets,
              )
          : classSpellReorder && classSpellReorderProvenance
            ? applyCreatureClassSpellReorders(
                draft.spells,
                classSpellReorderProvenance,
                classSpellReorder.reorders,
              )
          : draft.spells;
        const nextSkillListTruncationConfirmed = isRetainedCreature &&
          isExistingCreatureSkillCatalogAdmitted(sourceObject.source, skillCatalog)
          ? draft.skillListTruncationConfirmed
          : false;
        const phenotypeCatalog =
          creaturePhenotypeCatalogState?.objectId === objectId &&
          creaturePhenotypeCatalogState.status === "ready"
            ? creaturePhenotypeCatalogState.catalog
            : null;
        const nextPhenotypeId = materializeExistingCreaturePhenotype(
          sourceObject.source,
          sourceObject.creatureProperties?.phenotypeId,
          draft.phenotypeId,
          phenotypeCatalog,
        );
        const nextPhenotype = resolveCreaturePhenotypeDisplayName(
          nextPhenotypeId,
          phenotypeCatalog,
          sourceObject.creatureProperties?.phenotype ?? draft.phenotype.trim(),
        );
        const portraitProvenance = readExistingCreaturePortraitProvenance(sourceObject.source);
        const requestedPortraitId = portraitProvenance &&
          nextGenderId !== portraitProvenance.genderExpectedValue
          ? portraitProvenance.expectedValue
          : draft.portraitId;
        const nextPortraitDraft = portraitProvenance &&
          requestedPortraitId === portraitProvenance.expectedValue
          ? {
              ...draft,
              portraitId: portraitProvenance.expectedValue,
              portraitResRef: portraitProvenance.sourceBaseResRef,
            }
          : portraitProvenance
            ? materializeExistingCreaturePortrait(
                sourceObject.source,
                draft,
                requestedPortraitId,
                current.present.creaturePortraitCatalog,
              )
            : draft;
        if (portraitProvenance && requestedPortraitId !== portraitProvenance.expectedValue &&
          nextPortraitDraft === draft) return current;
        const nextChallengeRating = materializeExistingCreatureChallengeRating(
          sourceObject.source,
          sourceObject.creatureProperties?.challengeRating ?? draft.challengeRating,
          draft.challengeRating,
        );
        const nextAbilityScores = materializeExistingCreatureAbilityScores(
          sourceObject.source,
          sourceObject.creatureProperties?.statistics?.abilityScores ?? {
            strength: draft.strength,
            dexterity: draft.dexterity,
            constitution: draft.constitution,
            intelligence: draft.intelligence,
            wisdom: draft.wisdom,
            charisma: draft.charisma,
          },
          {
            strength: draft.strength,
            dexterity: draft.dexterity,
            constitution: draft.constitution,
            intelligence: draft.intelligence,
            wisdom: draft.wisdom,
            charisma: draft.charisma,
          },
        );
        const nextAppearanceColors = materializeExistingCreatureAppearanceColors(
          sourceObject.source,
          sourceObject.creatureProperties?.appearanceSettings?.colors ?? {
            skin: draft.appearanceColors.skin,
            hair: draft.appearanceColors.hair,
            tattoo1: draft.appearanceColors.tattoo1,
            tattoo2: draft.appearanceColors.tattoo2,
          },
          draft.appearanceColors,
        );
        const sourceAppearanceSettings = sourceObject.creatureProperties?.appearanceSettings;
        const bodyPartAppearanceSettings = materializeExistingCreatureBodyParts(
          sourceObject.source,
          sourceObject.source?.type === "aurora_git" && sourceAppearanceSettings
            ? { ...sourceAppearanceSettings, colors: nextAppearanceColors }
            : {
                partBasedAppearance: draft.appearancePartBased,
                ...draft.appearanceParts,
                colors: nextAppearanceColors,
                sourceOnlyParts: { ...draft.appearanceSourceOnlyParts },
              },
          draft.appearanceParts,
          draft.appearanceSourceOnlyParts,
        );
        const wingsCatalog =
          creatureWingsCatalogState?.objectId === objectId &&
          creatureWingsCatalogState.status === "ready"
            ? creatureWingsCatalogState.catalog
            : null;
        const tailCatalog =
          creatureTailCatalogState?.objectId === objectId &&
          creatureTailCatalogState.status === "ready"
            ? creatureTailCatalogState.catalog
            : null;
        const currentWingsRow = Number(bodyPartAppearanceSettings.wings);
        const draftWingsRow = Number(draft.appearanceParts.wings);
        const currentTailRow = Number(bodyPartAppearanceSettings.tail);
        const draftTailRow = Number(draft.appearanceParts.tail);
        const nextWingsRow = materializeExistingCreatureAppendage(
          sourceObject.source,
          "wings",
          Number.isSafeInteger(currentWingsRow) ? currentWingsRow : undefined,
          Number.isSafeInteger(draftWingsRow) ? draftWingsRow : undefined,
          wingsCatalog,
        );
        const nextTailRow = materializeExistingCreatureAppendage(
          sourceObject.source,
          "tail",
          Number.isSafeInteger(currentTailRow) ? currentTailRow : undefined,
          Number.isSafeInteger(draftTailRow) ? draftTailRow : undefined,
          tailCatalog,
        );
        const nextAppearanceSettings = sourceObject.source?.type === "aurora_git"
          ? {
              ...bodyPartAppearanceSettings,
              ...(nextWingsRow !== undefined ? { wings: String(nextWingsRow) } : {}),
              ...(nextTailRow !== undefined ? { tail: String(nextTailRow) } : {}),
            }
          : bodyPartAppearanceSettings;
        const sourceStatistics = sourceObject.creatureProperties?.statistics;
        const currentHitPointDraft = {
          constitution: sourceStatistics?.abilityScores.constitution ?? draft.constitution,
          baseHitPoints: sourceStatistics?.baseHitPoints ?? draft.baseHitPoints,
          hitPointBonuses: sourceStatistics?.hitPointBonuses ?? draft.hitPointBonuses,
          currentHitPoints: sourceStatistics?.currentHitPoints ??
            sourceStatistics?.maxHitPoints ?? draft.currentHitPoints,
          maxHitPoints: sourceStatistics?.maxHitPoints ?? draft.maxHitPoints,
        };
        const hitPointClassLevels = isRetainedCreature
          ? readCreatureHitPointCoupledClassLevels(sourceObject, nextClassEntries)
          : undefined;
        const nextHitPointDraft = isRetainedCreature
          ? materializeExistingCreatureHitPointDraft(
              sourceObject.source,
              currentHitPointDraft,
              {
                baseHitPoints: draft.baseHitPoints,
                constitution: nextAbilityScores.constitution,
                ...(hitPointClassLevels ? { classLevels: hitPointClassLevels } : {}),
              },
            )
          : {
              constitution: nextAbilityScores.constitution,
              baseHitPoints: draft.baseHitPoints,
              hitPointBonuses: draft.hitPointBonuses,
              currentHitPoints: draft.currentHitPoints,
              maxHitPoints: draft.maxHitPoints,
            };
        const coupledAbilityScores = nextAbilityScores.constitution ===
          nextHitPointDraft.constitution
          ? nextAbilityScores
          : { ...nextAbilityScores, constitution: nextHitPointDraft.constitution };
        const nextNaturalArmorClass = materializeExistingCreatureNaturalArmorClass(
          sourceObject.source,
          sourceObject.creatureProperties?.statistics?.naturalArmorClass ??
            draft.naturalArmorClass,
          draft.naturalArmorClass,
        );
        const nextSavingThrowBonuses = materializeExistingCreatureSavingThrowBonuses(
          sourceObject.source,
          {
            fortitude: sourceObject.creatureProperties?.statistics?.saves.fortitudeBonus ??
              draft.fortitudeBonus,
            reflex: sourceObject.creatureProperties?.statistics?.saves.reflexBonus ??
              draft.reflexBonus,
            will: sourceObject.creatureProperties?.statistics?.saves.willBonus ??
              draft.willBonus,
          },
          {
            fortitude: draft.fortitudeBonus,
            reflex: draft.reflexBonus,
            will: draft.willBonus,
          },
        );
        const nextAlignment = materializeExistingCreatureAlignment(
          sourceObject.source,
          sourceObject.creatureProperties?.alignment ?? draft.alignment,
          draft.alignment,
        );
        const nextLocalizedNames = materializeExistingCreatureNameLocalizedStrings(
          sourceObject.source,
          sourceObject.creatureProperties,
          {
            firstName: draft.firstName,
            ...(draft.firstNameEntries !== undefined
              ? { firstNameEntries: draft.firstNameEntries }
              : {}),
            lastName: draft.lastName,
            ...(draft.lastNameEntries !== undefined
              ? { lastNameEntries: draft.lastNameEntries }
              : {}),
            description: draft.description,
            ...(draft.descriptionEntries !== undefined
              ? { descriptionEntries: draft.descriptionEntries }
              : {}),
          },
        );
        const nextFirstName = nextLocalizedNames.firstName
          ?? sourceObject.creatureProperties?.firstName
          ?? resolveSceneObjectName(sourceObject);
        const nextLastName = nextLocalizedNames.lastName
          ?? sourceObject.creatureProperties?.lastName
          ?? "";
        const nextDescription = nextLocalizedNames.description
          ?? sourceObject.creatureProperties?.description
          ?? "";
        const nextName = [nextFirstName.trim(), nextLastName.trim()]
          .filter((part) => part.length > 0)
          .join(" ");
        const requestedBlueprintResRef = draft.advancedSettings.blueprintResRef.trim();
        const nextResRef = isRetainedCreature
          ? sourceObject.resRef
          : /^[A-Za-z0-9_]{1,16}$/u.test(requestedBlueprintResRef)
            ? requestedBlueprintResRef.toLowerCase()
            : sourceObject.resRef;
        const materializedInventory = draft.inventoryControlState === "ACTIVE_NOW"
          ? materializeExistingCreatureInventory(sourceObject, draft)
          : undefined;
        if (draft.inventoryControlState === "ACTIVE_NOW" && materializedInventory === null) {
          return current;
        }
        const materializedEquipment = draft.equippedItemsControlState === "ACTIVE_NOW"
          ? materializeExistingCreatureEquipment(sourceObject, draft)
          : undefined;
        if (
          draft.equippedItemsControlState === "ACTIVE_NOW" &&
          materializedEquipment === null
        ) {
          return current;
        }
        const nextInventoryItems = materializedInventory !== undefined
          ? materializedInventory?.map((entry) => ({ ...entry }))
          : sourceObject.creatureProperties?.inventoryItems?.map((entry) => ({
              ...entry,
              ...(entry.embeddedItem
                ? {
                    embeddedItem: {
                      ...entry.embeddedItem,
                      itemPropertyListEntries: entry.embeddedItem.itemPropertyListEntries?.map(
                        (propertyEntry) => ({ ...propertyEntry })
                      )
                    }
                  }
                : {})
            }));
        const nextEquippedItems = materializedEquipment !== undefined
          ? materializedEquipment?.map((entry) => ({ ...entry }))
          : sourceObject.creatureProperties?.equippedItems?.map((entry) => ({
              ...entry,
              ...(entry.embeddedItem
                ? {
                    embeddedItem: {
                      ...entry.embeddedItem,
                      itemPropertyListEntries: entry.embeddedItem.itemPropertyListEntries?.map(
                        (propertyEntry) => ({ ...propertyEntry })
                      )
                    }
                  }
                : {})
            }));
        const nextScriptSlots =
          sourceObject.source?.creatureScriptResRefs !== undefined
            ? materializeExistingCreatureScriptResRefs(
                sourceObject.source,
                sourceObject.creatureProperties?.scriptSlots,
                draft.scriptSlots,
              )
            : sourceObject.creatureProperties?.scriptSlots;

        const nextCreatureAdvancedSettings = {
          ...draft.advancedSettings,
          blueprintResRef: nextTemplateResRefAdvancedSettings?.blueprintResRef ?? nextResRef,
          disarmable: nextAdvancedDisarmable,
          plot: nextAdvancedPlot,
          immortal: nextAdvancedImmortal,
          leavesLootableCorpse: nextAdvancedLootable,
          noPermanentDeath: nextAdvancedNoPermanentDeath,
          faction: nextFactionAdvancedSettings?.faction ?? draft.advancedSettings.faction,
          subrace: nextSpecialIdentityAdvancedSettings?.subrace ??
            draft.advancedSettings.subrace,
          deity: nextSpecialIdentityAdvancedSettings?.deity ?? draft.advancedSettings.deity,
          soundSet: nextSoundSet,
          perceptionRange: nextPerceptionRange,
        };
        if (nextPerceptionRangeId === undefined) {
          Reflect.deleteProperty(nextCreatureAdvancedSettings, "perceptionRangeId");
        } else {
          nextCreatureAdvancedSettings.perceptionRangeId = nextPerceptionRangeId;
        }
        if (nextWalkRateId === undefined) {
          Reflect.deleteProperty(nextCreatureAdvancedSettings, "walkRateId");
        } else {
          nextCreatureAdvancedSettings.walkRateId = nextWalkRateId;
        }
        if (nextSoundSetFile === undefined) {
          Reflect.deleteProperty(nextCreatureAdvancedSettings, "soundSetFile");
        } else {
          nextCreatureAdvancedSettings.soundSetFile = nextSoundSetFile;
        }
        if (nextStartingPackageId === undefined) {
          Reflect.deleteProperty(nextCreatureAdvancedSettings, "startingPackageId");
        } else {
          nextCreatureAdvancedSettings.startingPackageId = nextStartingPackageId;
        }
        if (nextFactionAdvancedSettings?.factionId === undefined) {
          Reflect.deleteProperty(nextCreatureAdvancedSettings, "factionId");
        } else {
          nextCreatureAdvancedSettings.factionId = nextFactionAdvancedSettings.factionId;
        }
        if (nextCreatureBodyBagRow === undefined) {
          Reflect.deleteProperty(nextCreatureAdvancedSettings, "treasureModelRow");
        } else {
          nextCreatureAdvancedSettings.treasureModelRow = nextCreatureBodyBagRow;
        }
        if (nextCreatureDecayTimeSeconds === undefined) {
          Reflect.deleteProperty(nextCreatureAdvancedSettings, "corpseDecayTimeSeconds");
        } else {
          nextCreatureAdvancedSettings.corpseDecayTimeSeconds =
            nextCreatureDecayTimeSeconds;
        }

        const nextCreatureVariables = sourceObject.source?.type === "aurora_git"
          ? canEditExistingCreatureVariables(sourceObject.source)
            ? readCreatureVariableTargetEntries(draft.variables)?.map((entry) => ({ ...entry }))
              ?? sourceObject.creatureProperties?.variables?.map((entry) => ({ ...entry }))
              ?? []
            : sourceObject.creatureProperties?.variables?.map((entry) => ({ ...entry })) ?? []
          : draft.variables
              .map((entry) => ({ ...entry, name: entry.name.trim() }))
              .filter((entry) => entry.name.length > 0);
        const nextCreatureComments = materializeExistingCreatureComments(
          sourceObject.source,
          sourceObject.creatureProperties?.comments ?? "",
          draft.comments,
        );

        const nextCreatureProperties = {
          firstName: nextFirstName,
          ...(nextLocalizedNames.firstNameEntries !== undefined
            ? {
                firstNameEntries: nextLocalizedNames.firstNameEntries.map((entry) => ({ ...entry })),
              }
            : {}),
          lastName: nextLastName,
          ...(nextLocalizedNames.lastNameEntries !== undefined
            ? {
                lastNameEntries: nextLocalizedNames.lastNameEntries.map((entry) => ({ ...entry })),
              }
            : {}),
          race: draft.race.trim(),
          appearance: draft.appearance.trim(),
          ...(nextAppearanceType !== undefined ? { appearanceType: nextAppearanceType } : {}),
          phenotype: nextPhenotype,
          ...(nextPhenotypeId !== undefined ? { phenotypeId: nextPhenotypeId } : {}),
          gender: nextGender,
          ...(nextGenderId !== undefined ? { genderId: nextGenderId } : {}),
          description: nextDescription,
          ...(nextLocalizedNames.descriptionEntries !== undefined
            ? {
                descriptionEntries: nextLocalizedNames.descriptionEntries.map((entry) => ({
                  ...entry,
                })),
              }
            : {}),
          challengeRating: nextChallengeRating,
          portraitResRef: nextPortraitDraft.portraitResRef.trim(),
          ...(nextPortraitDraft.portraitId === undefined
            ? {}
            : { portraitId: nextPortraitDraft.portraitId }),
          conversation: nextConversation,
          noInterrupt: nextNoInterrupt,
          alignment: nextAlignment,
          statistics: {
            abilityScores: coupledAbilityScores,
            racialModifiers: {
              strength: draft.strRacial,
              dexterity: draft.dexRacial,
              constitution: draft.conRacial,
              intelligence: draft.intRacial,
              wisdom: draft.wisRacial,
              charisma: draft.chaRacial
            },
            saves: {
              fortitudeBase: draft.fortitudeBase,
              fortitudeBonus: nextSavingThrowBonuses.fortitude,
              reflexBase: draft.reflexBase,
              reflexBonus: nextSavingThrowBonuses.reflex,
              willBase: draft.willBase,
              willBonus: nextSavingThrowBonuses.will
            },
            naturalArmorClass: nextNaturalArmorClass,
            baseArmorClass: draft.baseArmorClass,
            dexterityBonus: draft.dexterityBonus,
            sizeModifier: draft.sizeModifier,
            baseHitPoints: nextHitPointDraft.baseHitPoints,
            hitPointBonuses: nextHitPointDraft.hitPointBonuses,
            currentHitPoints: nextHitPointDraft.currentHitPoints,
            maxHitPoints: nextHitPointDraft.maxHitPoints,
            movementRate: nextMovementRate
          },
          appearanceSettings: nextAppearanceSettings,
          ...(sourceObject.creatureProperties?.appearanceProfile
            ? { appearanceProfile: { ...sourceObject.creatureProperties.appearanceProfile } }
            : {}),
          ...(sourceObject.creatureProperties?.lookupProfile
            ? { lookupProfile: { ...sourceObject.creatureProperties.lookupProfile } }
            : {}),
          ...(sourceObject.creatureProperties?.listCounts
            ? { listCounts: { ...sourceObject.creatureProperties.listCounts } }
            : {}),
          ...(sourceObject.creatureProperties?.localizedStringRefs
            ? { localizedStringRefs: { ...sourceObject.creatureProperties.localizedStringRefs } }
            : {}),
          ...(sourceObject.creatureProperties?.localizedStrings
            ? { localizedStrings: { ...sourceObject.creatureProperties.localizedStrings } }
            : {}),
          classEntries: nextClassEntries.map((entry) => ({ ...entry })),
          classIdentityDestructiveSpellClearConfirmed:
            classIdentity?.destructiveSpellClearConfirmed ?? false,
          classSlotResizeDestructiveRemovalConfirmed:
            classSlotResize?.destructiveRemovedSlotsConfirmed ?? false,
          classSpellClearSlotIndices: classSpellClear?.classSlotIndices ?? [],
          classSpellClearConfirmed:
            classSpellClear?.destructiveSpellClearConfirmed ?? false,
          classSpellRemovalTargets: classSpellRemoval?.targets.map((target) => ({ ...target })) ?? [],
          classSpellRemovalConfirmed:
            classSpellRemoval?.destructiveSpellRemovalConfirmed ?? false,
          classSpellReorders: classSpellReorder?.reorders.map((reorder) => ({
            ...reorder,
            entryOrder: [...reorder.entryOrder],
          })) ?? [],
          classSpellReorderConfirmed: classSpellReorder?.spellReorderConfirmed ?? false,
          templateEntries: draft.templateEntries.map((entry) => ({ ...entry })),
          skills: nextSkills.map((entry) => ({
            ...(typeof entry.skillId === "number" ? { skillId: entry.skillId } : {}),
            skill: entry.skill,
            rank: Math.max(0, Math.min(255, Math.trunc(entry.rank)))
          })),
          skillListTruncationConfirmed: nextSkillListTruncationConfirmed,
          ...(nextScriptSlots ? { scriptSlots: { ...nextScriptSlots } } : {}),
          advancedSettings: nextCreatureAdvancedSettings,
          feats: nextFeats.map((entry) => ({ ...entry })),
          spells: nextSpells.map((entry) => ({ ...entry })),
          specialAbilities: nextSpecialAbilities.map((entry) => ({ ...entry })),
          variables: nextCreatureVariables,
          ...(nextInventoryItems !== undefined ? { inventoryItems: nextInventoryItems } : {}),
          ...(nextEquippedItems !== undefined ? { equippedItems: nextEquippedItems } : {}),
          comments: nextCreatureComments
        };

        previousObject = cloneSceneObject(sourceObject);
        const updatedObject: SceneObject = {
          ...sourceObject,
          name: nextName.length > 0 ? nextName : nextTag,
          tag: nextTag,
          resRef: nextResRef,
          source: sourceObject.source,
          creatureProperties: nextCreatureProperties,
          placeableProperties: undefined,
          encounterProperties: undefined,
          soundPositioning: undefined,
          doorTransition: undefined
        };
        appliedObject = cloneSceneObject(updatedObject);
        const nextObjects = current.present.objects.map((object) =>
          object.id === objectId ? updatedObject : object
        );

        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });

      trackTelemetry("scene.creature_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });
      if (appliedObject) {
        onCreaturePropertiesApplied?.(appliedObject, previousObject ?? appliedObject);
      }
      if (closeAfterApply) {
        creatureAppearanceCatalogRequestRevisionRef.current += 1;
        setCreatureAppearanceCatalogState(null);
        creatureGenderCatalogRequestRevisionRef.current += 1;
        setCreatureGenderCatalogState(null);
        creatureWingsCatalogRequestRevisionRef.current += 1;
        setCreatureWingsCatalogState(null);
        creatureTailCatalogRequestRevisionRef.current += 1;
        setCreatureTailCatalogState(null);
        creaturePerceptionRangeCatalogRequestRevisionRef.current += 1;
        setCreaturePerceptionRangeCatalogState(null);
        creatureWalkRateCatalogRequestRevisionRef.current += 1;
        setCreatureWalkRateCatalogState(null);
        creatureSoundSetCatalogRequestRevisionRef.current += 1;
        setCreatureSoundSetCatalogState(null);
        creatureStartingPackageCatalogRequestRevisionRef.current += 1;
        setCreatureStartingPackageCatalogState(null);
        creatureClassCatalogRequestRevisionRef.current += 1;
        setCreatureClassCatalogState(null);
        creatureSkillCatalogRequestRevisionRef.current += 1;
        setCreatureSkillCatalogState(null);
        creatureFeatCatalogRequestRevisionRef.current += 1;
        setCreatureFeatCatalogState(null);
        creatureSpecialAbilityCatalogRequestRevisionRef.current += 1;
        setCreatureSpecialAbilityCatalogState(null);
        creaturePhenotypeCatalogRequestRevisionRef.current += 1;
        setCreaturePhenotypeCatalogState(null);
        setCreaturePropertiesDialog(null);
      }
    },
    [
      cloneSceneObject,
      creatureAppearanceCatalogState,
      creatureGenderCatalogState,
      creatureWingsCatalogState,
      creatureTailCatalogState,
      creaturePerceptionRangeCatalogState,
      creatureWalkRateCatalogState,
      creatureSoundSetCatalogState,
      creatureStartingPackageCatalogState,
      creatureClassCatalogState,
      creatureSkillCatalogState,
      creatureFeatCatalogState,
      creatureSpecialAbilityCatalogState,
      creaturePhenotypeCatalogState,
      creaturePropertiesDialog,
      onCreaturePropertiesApplied,
      sceneViewportPort,
      trackTelemetry,
      userId
    ]
  );

  const cancelCreaturePropertiesDialog = useCallback(() => {
    if (creaturePropertiesDialog) {
      const snapshot = creaturePropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === snapshot.id);
        if (!sourceObject || sourceObject.kind !== "creatures" || snapshot.kind !== "creatures") {
          return current;
        }
        const sourceDraft = buildCreaturePropertiesDraft(
          sourceObject,
          current.present.placeableBodyBagCatalog,
          current.present.placeableFactionCatalog,
        );
        const snapshotDraft = buildCreaturePropertiesDraft(
          snapshot,
          current.present.placeableBodyBagCatalog,
          current.present.placeableFactionCatalog,
        );
        if (areCreaturePropertiesDraftsEqual(sourceDraft, snapshotDraft)) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === snapshot.id ? cloneSceneObject(snapshot) : object
        );
        return sceneViewportPort.commitHistory(current, {
          ...current.present,
          objects: nextObjects
        });
      });
      trackTelemetry("scene.creature_properties.cancel", {
        userId,
        objectId: snapshot.id
      });
    }
    creatureAppearanceCatalogRequestRevisionRef.current += 1;
    setCreatureAppearanceCatalogState(null);
    creatureGenderCatalogRequestRevisionRef.current += 1;
    setCreatureGenderCatalogState(null);
    creatureWingsCatalogRequestRevisionRef.current += 1;
    setCreatureWingsCatalogState(null);
    creatureTailCatalogRequestRevisionRef.current += 1;
    setCreatureTailCatalogState(null);
    creaturePerceptionRangeCatalogRequestRevisionRef.current += 1;
    setCreaturePerceptionRangeCatalogState(null);
    creatureWalkRateCatalogRequestRevisionRef.current += 1;
    setCreatureWalkRateCatalogState(null);
    creatureSoundSetCatalogRequestRevisionRef.current += 1;
    setCreatureSoundSetCatalogState(null);
    creatureStartingPackageCatalogRequestRevisionRef.current += 1;
    setCreatureStartingPackageCatalogState(null);
    creatureClassCatalogRequestRevisionRef.current += 1;
    setCreatureClassCatalogState(null);
    creatureSkillCatalogRequestRevisionRef.current += 1;
    setCreatureSkillCatalogState(null);
    creatureFeatCatalogRequestRevisionRef.current += 1;
    setCreatureFeatCatalogState(null);
    creatureSpecialAbilityCatalogRequestRevisionRef.current += 1;
    setCreatureSpecialAbilityCatalogState(null);
    creaturePhenotypeCatalogRequestRevisionRef.current += 1;
    setCreaturePhenotypeCatalogState(null);
    setCreaturePropertiesDialog(null);
  }, [cloneSceneObject, creaturePropertiesDialog, sceneViewportPort, trackTelemetry, userId]);

  const toggleCreaturePropertiesDialogCollapsed = useCallback(() => {
    setCreaturePropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startCreaturePropertiesDialogDrag,
    onHeaderPointerMove: moveCreaturePropertiesDialogDrag,
    onHeaderPointerUp: endCreaturePropertiesDialogDrag,
    onHeaderPointerCancel: cancelCreaturePropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: creaturePropertiesDialog,
    setDialog: setCreaturePropertiesDialog,
    hostRef,
    panelRef: creaturePropertiesDialogRef,
    dragRef: creaturePropertiesDialogDragRef,
    clampPosition: clampCreaturePropertiesDialogPosition,
    mapPosition: mapAnchoredDialogPosition
  });

  const clampItemPropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: itemPropertiesDialogRef.current,
        x,
        y,
        fallbackWidthPx: ITEM_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: ITEM_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect
      }),
    []
  );

  const openItemPropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "items") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            ITEM_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            ITEM_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampItemPropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      setItemPropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft: buildItemPropertiesDraft(target),
        activeTab: "basic",
        previewProcessingStatus: onItemPreviewObjectNeeded ? "processing" : "idle",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      trackTelemetry("scene.item_properties.open", {
        userId,
        objectId: target.id
      });
      if (onItemPreviewObjectNeeded) {
        void onItemPreviewObjectNeeded(cloneSceneObject(target))
          .then((processedObject) => {
            setItemPropertiesDialog((current) =>
              current?.objectId === target.id
                ? {
                    ...current,
                    snapshotObject: cloneSceneObject(processedObject),
                    previewProcessingStatus: "ready"
                  }
                : current
            );
          })
          .catch(() => {
            setItemPropertiesDialog((current) =>
              current?.objectId === target.id
                ? {
                    ...current,
                    previewProcessingStatus: "error"
                  }
                : current
            );
            trackTelemetry("scene.item_properties.preview_process_failed", {
              userId,
              objectId: target.id
            });
          });
      }
    },
    [
      clampItemPropertiesDialogPosition,
      cloneSceneObject,
      onItemPreviewObjectNeeded,
      trackTelemetry,
      userId
    ]
  );

  const setItemPropertiesActiveTab = useCallback((nextTab: ItemPropertiesTab) => {
    setItemPropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const updateItemPropertiesDraftField = useCallback(
    (
      field: keyof ItemPropertiesDraft,
      value:
        | string
        | number
        | boolean
        | undefined
        | NonNullable<ItemPropertiesDraft["localizedNameEntries"]>
        | NonNullable<ItemPropertiesDraft["descriptionEntries"]>
        | NonNullable<ItemPropertiesDraft["identifiedDescriptionEntries"]>,
    ) => {
      setItemPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        if (
          field === "localizedNameEntries" ||
          field === "descriptionEntries" ||
          field === "identifiedDescriptionEntries"
        ) {
          if (!Array.isArray(value)) return current;
          const targetField = field === "localizedNameEntries"
            ? "localizedName"
            : field === "descriptionEntries"
              ? "description"
              : "identifiedDescription";
          const nextEntries = reduceExistingItemLocalizedStringEntries(
            current.snapshotObject.source,
            targetField,
            current.draft[field] ?? [],
            value,
          );
          if (JSON.stringify(nextEntries) === JSON.stringify(current.draft[field] ?? [])) {
            return current;
          }
          return {
            ...current,
            draft: {
              ...current.draft,
              [field]: nextEntries,
              [targetField]: nextEntries.find((entry) => entry.languageId === 0)?.text ?? "",
            },
          };
        }
        if (field === "baseItem" &&
          !isItemWizardBlueprintEditorObject(current.snapshotObject)) {
          const nextDraft = reduceExistingItemBaseItemDraft(
            current.snapshotObject.source,
            current.draft,
            value,
            sceneRef.current?.itemBaseItemCatalog,
          );
          return areItemPropertiesDraftsEqual(current.draft, nextDraft)
            ? current
            : { ...current, draft: nextDraft };
        }
        const nextValue = field === "tag"
          ? reduceExistingItemTag(
              current.snapshotObject.source,
              current.draft.tag,
              value,
            )
          : field === "resRef"
            ? reduceExistingItemTemplateResRef(
                current.snapshotObject.source,
                current.draft.resRef,
                value,
              )
          : field === "comments"
            ? reduceExistingItemEditorComment(
              current.snapshotObject.source,
              current.draft.comments,
              value,
            )
          : field === "localizedName"
              || field === "description"
              || field === "identifiedDescription"
            ? reduceExistingItemLocalizedString(
                current.snapshotObject.source,
                field,
                current.draft[field],
                value,
              )
          : field === "charges"
              || field === "cost"
              || field === "stolen"
              || field === "stackSize"
              || field === "plot"
              || field === "addCost"
              || field === "identified"
              || field === "cursed"
            ? reduceExistingItemInstanceStateField(
                current.snapshotObject.source,
                field,
                current.draft[field],
                value,
              )
            : value;
        const localizedEntryField = field === "localizedName"
          ? "localizedNameEntries"
          : field === "description"
            ? "descriptionEntries"
            : field === "identifiedDescription"
              ? "identifiedDescriptionEntries"
              : undefined;
        const currentEntries = localizedEntryField
          ? current.draft[localizedEntryField]
          : undefined;
        const nextDraft = {
          ...current.draft,
          [field]: nextValue,
          ...(localizedEntryField && currentEntries && typeof nextValue === "string"
            ? {
                [localizedEntryField]: currentEntries.length === 0
                  ? nextValue.length === 0
                    ? []
                    : [{ languageId: 0, text: nextValue }]
                  : currentEntries.map((entry) => entry.languageId === 0
                    ? { ...entry, text: nextValue }
                    : { ...entry }),
              }
            : {}),
        };
        if (areItemPropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const updateItemArmorContextDraftField = useCallback(
    (field: keyof ItemPropertiesDraft["armorPreviewContext"], value: string) => {
      setItemPropertiesDialog((current) => {
        if (!current || current.draft.armorPreviewContext[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            armorPreviewContext: {
              ...current.draft.armorPreviewContext,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateItemArmorPartDraftField = useCallback(
    (field: keyof ItemPropertiesDraft["armorParts"], value: number | undefined) => {
      setItemPropertiesDialog((current) => {
        if (!current || current.draft.armorParts[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            armorParts: {
              ...current.draft.armorParts,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateItemMaterialColorDraftField = useCallback(
    (field: keyof ItemPropertiesDraft["materialColors"], value: number | undefined) => {
      setItemPropertiesDialog((current) => {
        if (!current || current.draft.materialColors[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            materialColors: {
              ...current.draft.materialColors,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const addItemPropertyEntry = useCallback(() => {
    setItemPropertiesDialog((current) => {
      if (!current) return current;
      const propertyList = isItemWizardBlueprintEditorObject(current.snapshotObject)
        ? [
            ...current.draft.propertyList,
            { propertyLabel: "", chanceAppear: 100 },
          ]
        : appendExistingItemProperty(
            current.snapshotObject.source,
            current.draft.propertyList,
          );
      if (propertyList === current.draft.propertyList) return current;
      return {
        ...current,
        draft: {
          ...current.draft,
          propertyList: [...propertyList]
        }
      };
    });
  }, []);

  const updateItemPropertyEntry = useCallback(
    (
      index: number,
      field: keyof ItemPropertiesDraft["propertyList"][number],
      value: string | number | undefined
    ) => {
      setItemPropertiesDialog((current) => {
        if (!current || index < 0 || index >= current.draft.propertyList.length) {
          return current;
        }
        const nextPropertyList = isItemWizardBlueprintEditorObject(current.snapshotObject)
          ? current.draft.propertyList.map((entry, entryIndex) =>
              entryIndex === index ? { ...entry, [field]: value } : entry
            )
          : updateExistingItemPropertyField(
              current.snapshotObject.source,
              current.draft.propertyList,
              index,
              field,
              value,
            );
        if (nextPropertyList === current.draft.propertyList) return current;
        return {
          ...current,
          draft: {
            ...current.draft,
            propertyList: [...nextPropertyList]
          }
        };
      });
    },
    []
  );

  const updateCreatureAppearanceSourceOnlyPart = useCallback(
    (
      field: keyof CreaturePropertiesDraft["appearanceSourceOnlyParts"],
      value: string,
    ) => {
      setCreaturePropertiesDialog((current) => {
        if (!current) return current;
        const currentValue = current.draft.appearanceSourceOnlyParts[field];
        const nextValue = field === "robe"
          ? currentValue
          : current.snapshotObject.source?.type === "aurora_git"
            ? reduceExistingCreatureBodyPart(
                current.snapshotObject.source,
                field,
                currentValue,
                value,
              )
            : value;
        if (currentValue === nextValue) return current;
        return {
          ...current,
          draft: {
            ...current.draft,
            appearanceSourceOnlyParts: {
              ...current.draft.appearanceSourceOnlyParts,
              [field]: nextValue,
            },
          },
        };
      });
    },
    [],
  );

  const moveItemPropertyEntry = useCallback((index: number, direction: "up" | "down") => {
    setItemPropertiesDialog((current) => {
      if (!current) return current;
      let propertyList: readonly ItemPropertiesDraft["propertyList"][number][];
      if (isItemWizardBlueprintEditorObject(current.snapshotObject)) {
        const target = direction === "up" ? index - 1 : index + 1;
        if (
          index < 0 || index >= current.draft.propertyList.length ||
          target < 0 || target >= current.draft.propertyList.length
        ) return current;
        const reordered = [...current.draft.propertyList];
        [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
        propertyList = reordered;
      } else {
        propertyList = moveExistingItemProperty(
          current.snapshotObject.source,
          current.draft.propertyList,
          index,
          direction,
        );
      }
      return propertyList === current.draft.propertyList
        ? current
        : { ...current, draft: { ...current.draft, propertyList: [...propertyList] } };
    });
  }, []);

  const removeItemPropertyEntry = useCallback((index: number) => {
    setItemPropertiesDialog((current) => {
      if (!current || index < 0 || index >= current.draft.propertyList.length) {
        return current;
      }
      const propertyList = isItemWizardBlueprintEditorObject(current.snapshotObject)
        ? current.draft.propertyList.filter((_entry, entryIndex) => entryIndex !== index)
        : removeExistingItemProperty(
            current.snapshotObject.source,
            current.draft.propertyList,
            index,
          );
      if (propertyList === current.draft.propertyList) return current;
      return {
        ...current,
        draft: {
          ...current.draft,
          propertyList: [...propertyList]
        }
      };
    });
  }, []);

  const addItemVariable = useCallback(() => {
    setItemPropertiesDialog((current) => {
      if (!current) return current;
      const variables = appendEditableItemVariable(
        current.snapshotObject,
        current.draft.variables,
      );
      return variables === current.draft.variables
        ? current
        : { ...current, draft: { ...current.draft, variables: [...variables] } };
    });
  }, []);

  const addItemBlueprintInventoryEntry = useCallback(() => {
    setItemPropertiesDialog((current) => {
      if (!current || !isItemWizardBlueprintEditorObject(current.snapshotObject)) return current;
      const inventory = appendWizardItemInventoryEntry(
        current.draft.blueprintInventoryItems,
        current.draft.blueprintEquippedItems,
      );
      return inventory === current.draft.blueprintInventoryItems
        ? current
        : { ...current, draft: { ...current.draft, blueprintInventoryItems: [...inventory] } };
    });
  }, []);

  const updateItemBlueprintInventoryEntry = useCallback((
    index: number,
    field: "resRef" | "x" | "y",
    value: string | number,
  ) => {
    setItemPropertiesDialog((current) => {
      if (!current || !isItemWizardBlueprintEditorObject(current.snapshotObject)) return current;
      const inventory = updateWizardItemInventoryEntry(
        current.draft.blueprintInventoryItems,
        index,
        field,
        value,
      );
      return inventory === current.draft.blueprintInventoryItems
        ? current
        : { ...current, draft: { ...current.draft, blueprintInventoryItems: [...inventory] } };
    });
  }, []);

  const moveItemBlueprintInventoryEntry = useCallback((
    index: number,
    direction: "up" | "down",
  ) => {
    setItemPropertiesDialog((current) => {
      if (!current || !isItemWizardBlueprintEditorObject(current.snapshotObject)) return current;
      const inventory = moveWizardItemInventoryEntry(
        current.draft.blueprintInventoryItems,
        index,
        direction,
      );
      return inventory === current.draft.blueprintInventoryItems
        ? current
        : { ...current, draft: { ...current.draft, blueprintInventoryItems: [...inventory] } };
    });
  }, []);

  const removeItemBlueprintInventoryEntry = useCallback((index: number) => {
    setItemPropertiesDialog((current) => {
      if (!current || !isItemWizardBlueprintEditorObject(current.snapshotObject)) return current;
      const inventory = removeWizardItemInventoryEntry(
        current.draft.blueprintInventoryItems,
        index,
      );
      return inventory === current.draft.blueprintInventoryItems
        ? current
        : { ...current, draft: { ...current.draft, blueprintInventoryItems: [...inventory] } };
    });
  }, []);

  const addItemBlueprintEquipmentEntry = useCallback(() => {
    setItemPropertiesDialog((current) => {
      if (!current || !isItemWizardBlueprintEditorObject(current.snapshotObject)) return current;
      const equipment = appendWizardItemEquipmentEntry(
        current.draft.blueprintInventoryItems,
        current.draft.blueprintEquippedItems,
      );
      return equipment === current.draft.blueprintEquippedItems
        ? current
        : { ...current, draft: { ...current.draft, blueprintEquippedItems: [...equipment] } };
    });
  }, []);

  const updateItemBlueprintEquipmentEntry = useCallback((
    index: number,
    field: "resRef" | "slotMask",
    value: string | number,
  ) => {
    setItemPropertiesDialog((current) => {
      if (!current || !isItemWizardBlueprintEditorObject(current.snapshotObject)) return current;
      const equipment = updateWizardItemEquipmentEntry(
        current.draft.blueprintEquippedItems,
        index,
        field,
        value,
      );
      return equipment === current.draft.blueprintEquippedItems
        ? current
        : { ...current, draft: { ...current.draft, blueprintEquippedItems: [...equipment] } };
    });
  }, []);

  const removeItemBlueprintEquipmentEntry = useCallback((index: number) => {
    setItemPropertiesDialog((current) => {
      if (!current || !isItemWizardBlueprintEditorObject(current.snapshotObject)) return current;
      const equipment = removeWizardItemEquipmentEntry(
        current.draft.blueprintEquippedItems,
        index,
      );
      return equipment === current.draft.blueprintEquippedItems
        ? current
        : { ...current, draft: { ...current.draft, blueprintEquippedItems: [...equipment] } };
    });
  }, []);

  const updateItemInventoryCoordinate = useCallback((
    index: number,
    field: "x" | "y",
    value: number,
  ) => {
    setItemPropertiesDialog((current) => {
      if (!current) return current;
      const inventoryItems = updateExistingItemInventoryCoordinate(
        current.snapshotObject.source,
        current.draft.inventoryItems,
        index,
        field,
        value,
      );
      return inventoryItems === current.draft.inventoryItems
        ? current
        : { ...current, draft: { ...current.draft, inventoryItems: [...inventoryItems] } };
    });
  }, []);

  const moveItemInventoryEntry = useCallback((
    index: number,
    direction: "up" | "down",
  ) => {
    setItemPropertiesDialog((current) => {
      if (!current) return current;
      const inventoryItems = moveExistingItemInventoryEntry(
        current.snapshotObject.source,
        current.draft.inventoryItems,
        index,
        direction,
      );
      return inventoryItems === current.draft.inventoryItems
        ? current
        : { ...current, draft: { ...current.draft, inventoryItems: [...inventoryItems] } };
    });
  }, []);

  const removeItemInventoryEntry = useCallback((index: number) => {
    setItemPropertiesDialog((current) => {
      if (!current) return current;
      const inventoryItems = removeExistingItemInventoryEntry(
        current.snapshotObject.source,
        current.draft.inventoryItems,
        index,
      );
      return inventoryItems === current.draft.inventoryItems
        ? current
        : { ...current, draft: { ...current.draft, inventoryItems: [...inventoryItems] } };
    });
  }, []);

  const addItemInventoryBlueprintEntry = useCallback((templateObjectId: string) => {
    const template = itemTemplateOptions.find((candidate) => candidate.id === templateObjectId);
    if (!template) return;
    setItemPropertiesDialog((current) => {
      if (!current || isItemWizardBlueprintEditorObject(current.snapshotObject)) return current;
      const inventoryItems = appendExistingItemInventoryBlueprintEntry(
        current.snapshotObject.source,
        current.draft.inventoryItems,
        template,
      );
      return inventoryItems === current.draft.inventoryItems
        ? current
        : { ...current, draft: { ...current.draft, inventoryItems: [...inventoryItems] } };
    });
  }, [itemTemplateOptions]);

  const updateItemVariable = useCallback((
    index: number,
    entry: ItemPropertiesDraft["variables"][number],
  ) => {
    setItemPropertiesDialog((current) => {
      if (!current) return current;
      const variables = updateEditableItemVariable(
        current.snapshotObject,
        current.draft.variables,
        index,
        entry,
      );
      return variables === current.draft.variables
        ? current
        : { ...current, draft: { ...current.draft, variables: [...variables] } };
    });
  }, []);

  const moveItemVariable = useCallback((index: number, direction: "up" | "down") => {
    setItemPropertiesDialog((current) => {
      if (!current) return current;
      const variables = moveEditableItemVariable(
        current.snapshotObject,
        current.draft.variables,
        index,
        direction,
      );
      return variables === current.draft.variables
        ? current
        : { ...current, draft: { ...current.draft, variables: [...variables] } };
    });
  }, []);

  const removeItemVariable = useCallback((index: number) => {
    setItemPropertiesDialog((current) => {
      if (!current) return current;
      const variables = removeEditableItemVariable(
        current.snapshotObject,
        current.draft.variables,
        index,
      );
      return variables === current.draft.variables
        ? current
        : { ...current, draft: { ...current.draft, variables: [...variables] } };
    });
  }, []);

  const applyItemPropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!itemPropertiesDialog) {
        return;
      }

      const draft = itemPropertiesDialog.draft;
      const objectId = itemPropertiesDialog.objectId;
      let appliedObject: SceneObject | null = null;
      let previousObject: SceneObject | null = null;
      let materializationPolicy: "wizard_blueprint" | "retained_exact_only" | null = null;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === objectId);
        if (!sourceObject || sourceObject.kind !== "items") {
          return current;
        }

        const sourceDraft = buildItemPropertiesDraft(sourceObject);
        if (areItemPropertiesDraftsEqual(sourceDraft, draft)) {
          return current;
        }

        const materialized = materializeItemPropertiesDraft(
          sourceObject,
          draft,
          current.present.itemBaseItemCatalog,
        );
        materializationPolicy = materialized.policy;
        previousObject = cloneSceneObject(sourceObject);
        const updatedObject: SceneObject = {
          ...materialized.object,
          placeableProperties: undefined,
          creatureProperties: undefined,
          encounterProperties: undefined,
          soundPositioning: undefined,
          doorTransition: undefined
        };
        if (
          updatedObject.name === sourceObject.name &&
          updatedObject.tag === sourceObject.tag &&
          updatedObject.resRef === sourceObject.resRef &&
          areItemPropertiesDraftsEqual(
            sourceDraft,
            buildItemPropertiesDraft(updatedObject),
          )
        ) {
          previousObject = null;
          materializationPolicy = null;
          return current;
        }
        appliedObject = cloneSceneObject(updatedObject);
        const nextObjects = current.present.objects.map((object) =>
          object.id === objectId ? updatedObject : object
        );
        return sceneViewportPort.commitHistory(current, {
          ...current.present,
          objects: nextObjects
        });
      });

      trackTelemetry("scene.item_properties.apply", {
        userId,
        objectId,
        closeAfterApply,
        materializationPolicy: materializationPolicy ?? "no_effective_change",
      });
      if (appliedObject) {
        onItemPropertiesApplied?.(appliedObject, previousObject ?? appliedObject);
      }
      if (closeAfterApply) {
        setItemPropertiesDialog(null);
      }
    },
    [cloneSceneObject, itemPropertiesDialog, onItemPropertiesApplied, sceneViewportPort, trackTelemetry, userId]
  );

  const cancelItemPropertiesDialog = useCallback(() => {
    if (itemPropertiesDialog) {
      const snapshot = itemPropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === snapshot.id);
        if (!sourceObject || sourceObject.kind !== "items" || snapshot.kind !== "items") {
          return current;
        }
        const sourceDraft = buildItemPropertiesDraft(sourceObject);
        const snapshotDraft = buildItemPropertiesDraft(snapshot);
        if (areItemPropertiesDraftsEqual(sourceDraft, snapshotDraft)) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === snapshot.id ? cloneSceneObject(snapshot) : object
        );
        return sceneViewportPort.commitHistory(current, {
          ...current.present,
          objects: nextObjects
        });
      });
      trackTelemetry("scene.item_properties.cancel", {
        userId,
        objectId: snapshot.id
      });
    }
    setItemPropertiesDialog(null);
  }, [cloneSceneObject, itemPropertiesDialog, sceneViewportPort, trackTelemetry, userId]);

  const toggleItemPropertiesDialogCollapsed = useCallback(() => {
    setItemPropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startItemPropertiesDialogDrag,
    onHeaderPointerMove: moveItemPropertiesDialogDrag,
    onHeaderPointerUp: endItemPropertiesDialogDrag,
    onHeaderPointerCancel: cancelItemPropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: itemPropertiesDialog,
    setDialog: setItemPropertiesDialog,
    hostRef,
    panelRef: itemPropertiesDialogRef,
    dragRef: itemPropertiesDialogDragRef,
    clampPosition: clampItemPropertiesDialogPosition,
    shouldIgnoreTarget: (target) => Boolean(target?.closest("button, input, select, textarea")),
    mapPosition: mapAnchoredDialogPosition
  });

  const { closeContextMenu, handleContextAction } = useWorkspaceContextMenuActions({
    contextMenu,
    setContextMenu,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    sceneViewportPort,
    setSceneHistory,
    selectedObjectIds,
    setSelectedObjectIds,
    setSelectedTileId,
    toolbarState,
    userId,
    trackTelemetry,
    duplicateObjects,
    focusCameraOnWorldPoint,
    openAdjustLocationDialog,
    openAreaObjectPolygonDialog,
    openWaypointPropertiesDialog,
    openPlaceablePropertiesDialog,
    openSoundPropertiesDialog,
    openDoorPropertiesDialog,
    openCreaturePropertiesDialog,
    openItemPropertiesDialog,
    openStorePropertiesDialog,
    clearAdjustLocationDialog: () => setAdjustLocationDialog(null),
    clearAreaObjectPolygonDialog: () => setAreaObjectPolygonDialog(null),
    clearWaypointPropertiesDialog: () => setWaypointPropertiesDialog(null),
    clearPlaceablePropertiesDialog: () => setPlaceablePropertiesDialog(null),
    clearSoundPropertiesDialog: () => setSoundPropertiesDialog(null),
    clearDoorPropertiesDialog: () => setDoorPropertiesDialog(null),
    clearCreaturePropertiesDialog: () => setCreaturePropertiesDialog(null),
    clearItemPropertiesDialog: () => setItemPropertiesDialog(null),
    clearStorePropertiesDialog: () => setStorePropertiesDialog(null)
  });

  useEffect(() => {
    if (!sidebarPropertiesSignal) {
      return;
    }
    if (sidebarPropertiesRevisionRef.current === sidebarPropertiesSignal.revision) {
      return;
    }

    const renderObjectIdsSet = resolveRenderObjectIdsSet(renderObjectIds);
    const selectedObject = resolveVisibleObjectForPropertiesSignal({
      objects: scene.objects,
      objectId: sidebarPropertiesSignal.objectId,
      objectKind: sidebarPropertiesSignal.objectKind,
      toolbarState,
      renderObjectIdsSet
    });
    if (!selectedObject) {
      return;
    }
    if (
      selectedObject.kind !== "placeables" &&
      selectedObject.kind !== "sounds" &&
      selectedObject.kind !== "doors" &&
      selectedObject.kind !== "creatures" &&
      selectedObject.kind !== "items" &&
      selectedObject.kind !== "stores" &&
      selectedObject.kind !== "triggers" &&
      selectedObject.kind !== "encounters" &&
      selectedObject.kind !== "waypoints"
    ) {
      return;
    }
    if (
      (selectedObject.kind === "triggers" || selectedObject.kind === "encounters")
      && !buildAreaObjectPolygonDraft(selectedObject)
    ) {
      return;
    }

    sidebarPropertiesRevisionRef.current = sidebarPropertiesSignal.revision;
    setSelectedTileId(null);
    setSelectedObjectIds([selectedObject.id]);
    setContextMenu(null);
    setAdjustLocationDialog(null);

    if (selectedObject.kind === "placeables") {
      setAreaObjectPolygonDialog(null);
      setWaypointPropertiesDialog(null);
      setSoundPropertiesDialog(null);
      setDoorPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      setItemPropertiesDialog(null);
      setStorePropertiesDialog(null);
      openPlaceablePropertiesDialog(selectedObject);
    } else if (selectedObject.kind === "sounds") {
      setAreaObjectPolygonDialog(null);
      setWaypointPropertiesDialog(null);
      setPlaceablePropertiesDialog(null);
      setDoorPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      setItemPropertiesDialog(null);
      setStorePropertiesDialog(null);
      openSoundPropertiesDialog(selectedObject);
    } else if (selectedObject.kind === "doors") {
      setAreaObjectPolygonDialog(null);
      setWaypointPropertiesDialog(null);
      setPlaceablePropertiesDialog(null);
      setSoundPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      setItemPropertiesDialog(null);
      setStorePropertiesDialog(null);
      openDoorPropertiesDialog(selectedObject);
    } else if (selectedObject.kind === "creatures") {
      setAreaObjectPolygonDialog(null);
      setWaypointPropertiesDialog(null);
      setPlaceablePropertiesDialog(null);
      setSoundPropertiesDialog(null);
      setDoorPropertiesDialog(null);
      setItemPropertiesDialog(null);
      setStorePropertiesDialog(null);
      openCreaturePropertiesDialog(selectedObject);
    } else if (selectedObject.kind === "items") {
      setAreaObjectPolygonDialog(null);
      setWaypointPropertiesDialog(null);
      setPlaceablePropertiesDialog(null);
      setSoundPropertiesDialog(null);
      setDoorPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      setStorePropertiesDialog(null);
      openItemPropertiesDialog(selectedObject);
    } else if (selectedObject.kind === "stores") {
      setAreaObjectPolygonDialog(null);
      setWaypointPropertiesDialog(null);
      setPlaceablePropertiesDialog(null);
      setSoundPropertiesDialog(null);
      setDoorPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      setItemPropertiesDialog(null);
      openStorePropertiesDialog(selectedObject);
    } else if (selectedObject.kind === "waypoints") {
      setAreaObjectPolygonDialog(null);
      setPlaceablePropertiesDialog(null);
      setSoundPropertiesDialog(null);
      setDoorPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      setItemPropertiesDialog(null);
      setStorePropertiesDialog(null);
      openWaypointPropertiesDialog(selectedObject);
    } else {
      setWaypointPropertiesDialog(null);
      setPlaceablePropertiesDialog(null);
      setSoundPropertiesDialog(null);
      setDoorPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      setItemPropertiesDialog(null);
      setStorePropertiesDialog(null);
      openAreaObjectPolygonDialog(selectedObject);
    }

    trackTelemetry("scene.properties.open_from_scene_object_list", {
      userId,
      objectId: selectedObject.id,
      objectKind: selectedObject.kind,
      revision: sidebarPropertiesSignal.revision
    });
  }, [
    openCreaturePropertiesDialog,
    openDoorPropertiesDialog,
    openItemPropertiesDialog,
    openAreaObjectPolygonDialog,
    openWaypointPropertiesDialog,
    openPlaceablePropertiesDialog,
    openSoundPropertiesDialog,
    openStorePropertiesDialog,
    renderObjectIds,
    scene.objects,
    sidebarPropertiesSignal,
    toolbarState,
    trackTelemetry,
    userId
  ]);

  useEffect(() => {
    if (!areaObjectPolygonDialog) return;
    const target = scene.objects.find(
      (object) => object.id === areaObjectPolygonDialog.objectId,
    );
    const isLogicalPolygonTarget =
      target?.kind === "triggers" || target?.kind === "encounters";
    if (
      !target
      || (!isLogicalPolygonTarget && !visibleObjectIdsSet.has(target.id))
      || !buildAreaObjectPolygonDraft(target)
    ) {
      setAreaObjectPolygonDialog(null);
    }
  }, [areaObjectPolygonDialog, scene.objects, visibleObjectIdsSet]);

  useEffect(() => {
    if (!waypointPropertiesDialog) return;
    const target = scene.objects.find(
      (object) => object.id === waypointPropertiesDialog.objectId,
    );
    // A retained Waypoint remains a logical Area record even while its canvas
    // marker is hidden. The exact-provenance draft controls editability, so
    // canvas render membership must not close a dialog opened from the list.
    if (!target || target.kind !== "waypoints") {
      setWaypointPropertiesDialog(null);
    }
  }, [scene.objects, waypointPropertiesDialog]);

  useEffect(() => {
    if (!canvasCreateObjectSignal) {
      return;
    }
    if (canvasCreateObjectRevisionRef.current === canvasCreateObjectSignal.revision) {
      return;
    }

    canvasCreateObjectRevisionRef.current = canvasCreateObjectSignal.revision;
    beginObjectAddPlacement(canvasCreateObjectSignal.template, canvasCreateObjectSignal.revision);
  }, [beginObjectAddPlacement, canvasCreateObjectSignal]);

  useAnchoredContextMenuSync({
    contextMenu,
    setContextMenu,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    menuRef: contextMenuRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    fallbackWidthPx: CONTEXT_MENU_FALLBACK_WIDTH_PX,
    fallbackHeightPx: CONTEXT_MENU_FALLBACK_HEIGHT_PX,
    onEscape: closeContextMenu
  });

  useAnchoredObjectDialogSync({
    dialog: areaObjectPolygonDialog,
    setDialog: setAreaObjectPolygonDialog,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    panelRef: areaObjectPolygonDialogRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    objectKind: AREA_OBJECT_POLYGON_DIALOG_KINDS,
    fallbackWidthPx: AREA_OBJECT_POLYGON_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: AREA_OBJECT_POLYGON_DIALOG_FALLBACK_HEIGHT_PX,
    layoutKey: areaObjectPolygonDialog?.collapsed,
  });

  useAnchoredObjectDialogSync({
    dialog: storePropertiesDialog,
    setDialog: setStorePropertiesDialog,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    panelRef: storePropertiesDialogRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    objectKind: "stores",
    fallbackWidthPx: STORE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: STORE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
    layoutKey: storePropertiesDialog?.collapsed,
  });

  useAnchoredObjectDialogSync({
    dialog: soundPropertiesDialog,
    setDialog: setSoundPropertiesDialog,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    panelRef: soundPropertiesDialogRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    objectKind: "sounds",
    fallbackWidthPx: SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
    layoutKey: soundPropertiesDialog?.collapsed
  });

  useAnchoredObjectDialogSync({
    dialog: placeablePropertiesDialog,
    setDialog: setPlaceablePropertiesDialog,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    panelRef: placeablePropertiesDialogRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    objectKind: "placeables",
    fallbackWidthPx: PLACEABLE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: PLACEABLE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
    layoutKey: placeablePropertiesDialog?.collapsed
  });

  useAnchoredObjectDialogSync({
    dialog: doorPropertiesDialog,
    setDialog: setDoorPropertiesDialog,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    panelRef: doorPropertiesDialogRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    objectKind: "doors",
    fallbackWidthPx: DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
    layoutKey: doorPropertiesDialog?.collapsed
  });

  useAnchoredObjectDialogSync({
    dialog: creaturePropertiesDialog,
    setDialog: setCreaturePropertiesDialog,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    panelRef: creaturePropertiesDialogRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    objectKind: "creatures",
    fallbackWidthPx: CREATURE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: CREATURE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
    layoutKey: creaturePropertiesDialog?.collapsed
  });

  useAnchoredObjectDialogSync({
    dialog: itemPropertiesDialog,
    setDialog: setItemPropertiesDialog,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    panelRef: itemPropertiesDialogRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    objectKind: "items",
    fallbackWidthPx: ITEM_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: ITEM_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
    layoutKey: itemPropertiesDialog?.collapsed
  });

  useWorkspaceObjectDialogEffects({
    scene,
    visibleObjectIdsSet,
    adjustLocationUnitsPerTile,
    adjustLocationDialog,
    setAdjustLocationDialog,
    cancelAdjustLocationDialog,
    clampAdjustLocationDialogPosition,
    placeablePropertiesDialog,
    setPlaceablePropertiesDialog,
    cancelPlaceablePropertiesDialog,
    clampPlaceablePropertiesDialogPosition,
    soundPropertiesDialog,
    setSoundPropertiesDialog,
    cancelSoundPropertiesDialog,
    clampSoundPropertiesDialogPosition,
    doorPropertiesDialog,
    setDoorPropertiesDialog,
    cancelDoorPropertiesDialog,
    clampDoorPropertiesDialogPosition,
    creaturePropertiesDialog,
    setCreaturePropertiesDialog,
    cancelCreaturePropertiesDialog,
    clampCreaturePropertiesDialogPosition,
    itemPropertiesDialog,
    setItemPropertiesDialog,
    cancelItemPropertiesDialog,
    clampItemPropertiesDialogPosition
  });

  const selectedTile = selectedTileId
    ? scene.tiles.find((tile) => tile.id === selectedTileId) ?? null
    : null;
  const areaEditingFeedback = clipboardFeedback ?? areaPlacementFeedback;

  const undoAreaTileEdit = useCallback(() => {
    setSceneHistory((current) => sceneViewportPort.undoHistory(current));
    setAreaPlacementFeedback(null);
    clearClipboardFeedback();
  }, [clearClipboardFeedback, sceneViewportPort]);

  const redoAreaTileEdit = useCallback(() => {
    setSceneHistory((current) => sceneViewportPort.redoHistory(current));
    setAreaPlacementFeedback(null);
    clearClipboardFeedback();
  }, [clearClipboardFeedback, sceneViewportPort]);

  const selectedSummary =
    visibleSelectableSelectedObjectIds.length > 0
      ? `${visibleSelectableSelectedObjectIds.length} object(s)`
      : selectedTile
        ? `tile ${selectedTile.col},${selectedTile.row}`
        : "none";
  const selectedObjectsForTransform = resolveVisibleSelectedObjects({
    selectedObjectIds,
    objects: visibleObjects
  });
  const gizmoModeBadge = resolveGizmoModeBadge(toolbarState.canvasDebug.gizmoMode);
  const visualTransformBlockedReason = isVisualTransformGizmoMode(toolbarState.canvasDebug.gizmoMode)
    ? resolveVisualTransformSelectionBlockedReason(
        selectedObjectsForTransform,
        toolbarState.canvasDebug
      )
    : null;
  const nonRenderCount = scene.objects.filter(
    (object) => resolveObjectRenderStatus(object) === "non_render"
  ).length;
  const lockedKinds = Object.entries(toolbarState.canvasDebug.lockedKinds)
    .filter(([, locked]) => locked)
    .map(([kind]) => kind);
  const lockSummary = lockedKinds.length > 0 ? lockedKinds.join(", ") : "none";
  const isolateSummary = toolbarState.canvasDebug.isolateKind;
  const bookmarkSaved = Boolean(bookmark1Ref.current);
  const snapSummary = [
    toolbarState.canvasDebug.snapGrid ? "grid" : null,
    toolbarState.canvasDebug.snapAngle ? "angle" : null,
    toolbarState.canvasDebug.snapHeight ? "height" : null
  ]
    .filter(Boolean)
    .join(", ");

  const saveStatus = `${formatAreaWorkspaceDraftStatus(areaWorkspaceDraftStatus)}${
    areaWorkspaceDraftStatus.state === "saved" && lastSavedAtUnixMs
      ? ` at ${new Date(lastSavedAtUnixMs).toLocaleTimeString()}`
      : ""
  }`;
  const controlPresetLabel = "Aurora Classic";
  const inputHint =
    "LMB select/paint | Double LMB connected terrain | Alt+LMB add object | Ctrl+LMB multi | Shift drag box | MMB rotate | Ctrl+RMB pan | RMB object menu | Wheel zoom | Arrows move selected | Ctrl/Cmd+C copy | Ctrl/Cmd+X cut | Ctrl/Cmd+V paste | Del delete | Gizmo: 1 world move / 2 world bearing / 3 VT rotate / 4 VT offset / 5 VT scale | Canvas menu: gizmo/snap/layers/debug";
  // The canvas stage lives between the floating sidebars.  Keep every HUD control
  // relative to that same rectangle: using the full workspace here made Three.js
  // frame terrain for pixels that were actually covered by the panels.
  const hudLeftPx = 14;
  const hudRightPx = 14;
  const hudMaxWidth = "calc(100% - 28px)";
  const controlsHintBottomPx = 14;

  useEffect(() => {
    if (!toolbarState.canvasDebug.runtimeHud && runtimePopupPinned) {
      setRuntimePopupPinned(false);
    }
  }, [runtimePopupPinned, toolbarState.canvasDebug.runtimeHud]);

  const selectionBoxStyle = useMemo(() => {
    if (!selectionBox.active) {
      return undefined;
    }
    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const width = Math.abs(selectionBox.currentX - selectionBox.startX);
    const height = Math.abs(selectionBox.currentY - selectionBox.startY);
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    };
  }, [selectionBox]);

  const contextObject = resolveContextMenuActionObject({
    contextMenu,
    sceneObjects: scene.objects,
    visibleObjectIdsSet
  });
  const isContextObjectLocked = contextObject
    ? isKindLocked(toolbarState.canvasDebug, contextObject.kind)
    : false;
  const isContextPropertiesSupported =
    contextObject?.kind === "placeables" ||
    contextObject?.kind === "sounds" ||
    contextObject?.kind === "doors" ||
    contextObject?.kind === "creatures" ||
    contextObject?.kind === "items" ||
    contextObject?.kind === "stores" ||
    contextObject?.kind === "waypoints" ||
    ((contextObject?.kind === "triggers" || contextObject?.kind === "encounters")
      && buildAreaObjectPolygonDraft(contextObject) !== null);

  return (
    <section
      className="canvas-stage-real"
      style={{ left: `${leftPanelWidthPx}px`, right: `${rightPanelWidthPx}px` }}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
    >
      <div
        ref={hostRef}
        className={`workspace-render-canvas ${objectAddPlacementMode ? "is-object-add-placement" : ""}`}
        aria-label="workspace render canvas"
        role="img"
        tabIndex={0}
        data-current-scene-id={scene.sceneId}
        data-current-scene-size={`${scene.width}x${scene.height}`}
        data-current-scene-tile-count={scene.tiles.length}
        data-current-scene-object-count={scene.objects.length}
        data-area-editing-proof-state={
          import.meta.env.DEV && scene.auroraAreaEditing
            ? serializeAreaEditingProofState(scene)
            : undefined
        }
        data-area-editing-proof-tool={
          import.meta.env.DEV ? serializeAreaEditingProofTool(areaEditingTool) : undefined
        }
        data-area-editing-proof-history={
          import.meta.env.DEV && scene.auroraAreaEditing
            ? serializeAreaEditingProofHistory(sceneHistory)
            : undefined
        }
        data-area-editing-proof-history-past-count={
          import.meta.env.DEV ? sceneHistory.past.length : undefined
        }
        data-area-editing-proof-history-future-count={
          import.meta.env.DEV ? sceneHistory.future.length : undefined
        }
        data-area-editing-proof-selection={
          import.meta.env.DEV && scene.auroraAreaEditing
            ? serializeAreaEditingProofSelection(scene, selectedTileId, selectedTileIds)
            : undefined
        }
        data-area-editing-proof-feedback={
          import.meta.env.DEV && scene.auroraAreaEditing
            ? serializeAreaEditingProofFeedback(areaEditingFeedback)
            : undefined
        }
        data-external-scene-id={externalSceneSeed?.sceneId ?? ""}
        data-external-scene-size={
          externalSceneSeed ? `${externalSceneSeed.width}x${externalSceneSeed.height}` : ""
        }
        data-external-scene-object-count={externalSceneSeed?.objects.length ?? ""}
        onMouseDown={handleCanvasMouseDown}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
        onWheel={handleCanvasWheel}
        onContextMenu={(event) => {
          event.preventDefault();
          if (objectAddPlacementMode) {
            cancelObjectAddPlacement("context_menu");
          }
        }}
      />

      {selectionBox.active && selectionBoxStyle ? (
        <div className="canvas-selection-box" style={selectionBoxStyle} aria-hidden="true" />
      ) : null}

      <AuroraAreaCanvasCommands
        visible={Boolean(scene.auroraAreaEditing)}
        canUndo={sceneHistory.past.length > 0}
        canRedo={sceneHistory.future.length > 0}
        hasSelectedTile={Boolean(selectedTile)}
        hasClipboardTiles={hasClipboardTiles}
        feedback={areaEditingFeedback}
        leftPx={hudLeftPx}
        maxWidth={hudMaxWidth}
        onUndo={undoAreaTileEdit}
        onRedo={redoAreaTileEdit}
        onCopy={() => copySelectedTilesToClipboard("area_canvas_toolbar")}
        onCut={() => cutSelectedTilesToClipboard("area_canvas_toolbar")}
        onPaste={() => pasteClipboardTiles("area_canvas_toolbar")}
        onRemove={() => deleteSelectedTiles("area_canvas_toolbar")}
      />

      {renderAreaGeometry &&
      !areaSharedRendererModelLoadComplete &&
      (areaObjectSharedRendererDiagnostics.primitiveFallbackCount > 0 ||
        areaObjectSharedRendererDiagnostics.missingPayloadIds) ? (
        <aside
          className="canvas-area-runtime-alert"
          role="status"
          aria-live="polite"
          aria-label="area renderer blockers"
        >
          <strong>
            {hasAreaPayloadRequestsInFlight
              ? "Area PLC/DOR payloads loading"
              : "Area PLC/DOR placeholders"}
          </strong>
          <span>
            {formatAreaSharedRendererIssueSummary(areaObjectSharedRendererDiagnostics, {
              payloadRequestsInFlight: hasAreaPayloadRequestsInFlight
            })}
          </span>
        </aside>
      ) : null}

      {canvasLoadOverlay.visible ? (
        <aside
          className={`canvas-placeable-load-overlay canvas-placeable-load-overlay-${placeableLoadOverlay.variant} canvas-placeable-load-overlay-${canvasLoadOverlay.variant} canvas-placeable-load-overlay-${canvasLoadOverlay.source}`}
          role="status"
          aria-live="polite"
          aria-label={`${canvasLoadOverlay.source} assets ${canvasLoadOverlay.variant}`}
        >
          <span className="canvas-placeable-load-spinner" aria-hidden="true" />
          <p className="canvas-placeable-load-title">{canvasLoadOverlay.title}</p>
          <p className="canvas-placeable-load-progress">
            {formatCanvasLoadOverlayProgress(canvasLoadOverlay)}
          </p>
          {canvasLoadOverlay.currentLabel ? (
            <p className="canvas-placeable-load-note">
              Current: {canvasLoadOverlay.currentLabel}
            </p>
          ) : null}
          {isCanvasAssetLoading ? (
            <p className="canvas-placeable-load-note">Orbit paused while assets load</p>
          ) : null}
        </aside>
      ) : null}

      {showGizmoModeBadge ? (
        <aside
          className={`canvas-gizmo-mode-badge canvas-gizmo-mode-badge-${gizmoModeBadge.variant}`}
          role="note"
          aria-label="gizmo mode badge"
          style={{ left: `${hudLeftPx}px` }}
        >
          {gizmoModeBadge.label}
        </aside>
      ) : null}

      {contextMenu ? (
        <WorkspaceContextMenu
          contextMenu={contextMenu}
          contextObject={contextObject}
          menuRef={contextMenuRef}
          isContextObjectLocked={isContextObjectLocked}
          isContextPropertiesSupported={isContextPropertiesSupported}
          onAction={handleContextAction}
        />
      ) : null}

      {adjustLocationDialog ? (
        <AdjustLocationDialog
          dialog={adjustLocationDialog}
          articleRef={adjustLocationDialogRef}
          onToggleCollapsed={toggleAdjustLocationDialogCollapsed}
          onClose={cancelAdjustLocationDialog}
          onDraftFieldChange={updateAdjustLocationDraftField}
          onApply={applyAdjustLocationDraft}
          onHeaderPointerDown={startAdjustLocationDialogDrag}
          onHeaderPointerMove={moveAdjustLocationDialogDrag}
          onHeaderPointerUp={endAdjustLocationDialogDrag}
          onHeaderPointerCancel={cancelAdjustLocationDialogDrag}
        />
      ) : null}

      {areaObjectPolygonDialog ? (
        <AreaObjectPolygonDialog
          dialog={areaObjectPolygonDialog}
          articleRef={areaObjectPolygonDialogRef}
          onToggleCollapsed={toggleAreaObjectPolygonDialogCollapsed}
          onClose={cancelAreaObjectPolygonDialog}
          onTagChange={updateAreaObjectPolygonTag}
          onActiveChange={updateAreaObjectPolygonActive}
          onPlayerOnlyChange={updateAreaObjectPolygonPlayerOnly}
          onResetChange={updateAreaObjectPolygonReset}
          onResetTimeChange={updateAreaObjectPolygonResetTime}
          onSpawnOptionChange={updateAreaObjectPolygonSpawnOption}
          onRespawnsFiniteChange={updateAreaObjectPolygonRespawnsFinite}
          onRespawnsInfiniteChange={updateAreaObjectPolygonRespawnsInfinite}
          onMaximumCreaturesChange={updateAreaObjectPolygonMaximumCreatures}
          onMinimumCreaturesChange={updateAreaObjectPolygonMinimumCreatures}
          onScriptResRefChange={updateAreaObjectPolygonScriptResRef}
          onTriggerScriptResRefChange={updateAreaObjectPolygonTriggerScriptResRef}
          onTriggerTransitionStorageChange={
            updateAreaObjectPolygonTriggerTransitionStorage
          }
          onTriggerCorePropertiesChange={
            updateAreaObjectPolygonTriggerCoreProperties
          }
          onTriggerTrapPropertiesChange={
            updateAreaObjectPolygonTriggerTrapProperties
          }
          encounterFactionCatalog={sceneHistory.present.placeableFactionCatalog ?? null}
          onFactionChange={updateAreaObjectPolygonFaction}
          encounterDifficultyCatalog={sceneHistory.present.encounterDifficultyCatalog ?? null}
          onDifficultyChange={updateAreaObjectPolygonDifficulty}
          onTemplateResRefChange={updateAreaObjectPolygonTemplateResRef}
          onLocalizedNameChange={updateAreaObjectPolygonLocalizedName}
          onEditorCommentChange={updateAreaObjectPolygonEditorComment}
          onVariablesChange={updateAreaObjectPolygonVariables}
          creatureBlueprintOptions={encounterCreatureBlueprintOptions}
          onCreatureSingleSpawnChange={updateAreaObjectPolygonCreatureSingleSpawn}
          onAddCreature={addAreaObjectPolygonCreature}
          onReplaceCreature={replaceAreaObjectPolygonCreature}
          onRemoveCreature={removeAreaObjectPolygonCreatureEntry}
          onMoveCreature={moveAreaObjectPolygonCreatureEntry}
          onSpawnPointChange={updateAreaObjectPolygonSpawnPoint}
          onAddSpawnPoint={addAreaObjectPolygonSpawnPoint}
          onRemoveSpawnPoint={removeAreaObjectPolygonSpawnPoint}
          onMoveSpawnPoint={moveAreaObjectPolygonSpawnPoint}
          onPointChange={updateAreaObjectPolygonPoint}
          onAddPoint={addAreaObjectPolygonPoint}
          onRemovePoint={removeAreaObjectPolygonPoint}
          onResetToSource={resetAreaObjectPolygonToSource}
          onApply={applyAreaObjectPolygonDraft}
          onHeaderPointerDown={startAreaObjectPolygonDialogDrag}
          onHeaderPointerMove={moveAreaObjectPolygonDialogDrag}
          onHeaderPointerUp={endAreaObjectPolygonDialogDrag}
          onHeaderPointerCancel={cancelAreaObjectPolygonDialogDrag}
        />
      ) : null}

      {waypointPropertiesDialog ? (
        <WaypointPropertiesDialog
          dialog={waypointPropertiesDialog}
          articleRef={waypointPropertiesDialogRef}
          onToggleCollapsed={toggleWaypointPropertiesDialogCollapsed}
          onClose={cancelWaypointPropertiesDialog}
          onTagChange={updateWaypointPropertiesTag}
          onTemplateResRefChange={updateWaypointPropertiesTemplateResRef}
          onLocalizedNameChange={updateWaypointPropertiesLocalizedName}
          onDescriptionChange={updateWaypointPropertiesDescription}
          onHasMapNoteChange={(hasMapNote) => updateWaypointPropertiesMapNote({
            hasMapNote,
            mapNoteText: waypointPropertiesDialog.draft.mapNoteText,
            mapNoteEnabled: waypointPropertiesDialog.draft.mapNoteEnabled,
          })}
          onMapNoteTextChange={(mapNoteText) => updateWaypointPropertiesMapNote({
            hasMapNote: waypointPropertiesDialog.draft.hasMapNote,
            mapNoteText,
            mapNoteEnabled: waypointPropertiesDialog.draft.mapNoteEnabled,
          })}
          onMapNoteEnabledChange={(mapNoteEnabled) => updateWaypointPropertiesMapNote({
            hasMapNote: waypointPropertiesDialog.draft.hasMapNote,
            mapNoteText: waypointPropertiesDialog.draft.mapNoteText,
            mapNoteEnabled,
          })}
          appearanceCatalog={waypointAppearanceCatalogState?.objectId ===
            waypointPropertiesDialog.objectId
            ? waypointAppearanceCatalogState.catalog
            : null}
          appearanceCatalogStatus={waypointAppearanceCatalogState?.objectId ===
            waypointPropertiesDialog.objectId
            ? waypointAppearanceCatalogState.status
            : "unavailable"}
          onAppearanceChange={updateWaypointPropertiesAppearance}
          onVariablesChange={updateWaypointPropertiesVariables}
          onCommentsChange={updateWaypointPropertiesComments}
          onApply={applyWaypointPropertiesDialog}
          onHeaderPointerDown={startWaypointPropertiesDialogDrag}
          onHeaderPointerMove={moveWaypointPropertiesDialogDrag}
          onHeaderPointerUp={endWaypointPropertiesDialogDrag}
          onHeaderPointerCancel={cancelWaypointPropertiesDialogDrag}
        />
      ) : null}

      {storePropertiesDialog ? (
        <StorePropertiesDialog
          dialog={storePropertiesDialog}
          articleRef={storePropertiesDialogRef}
          onToggleCollapsed={toggleStorePropertiesDialogCollapsed}
          onClose={cancelStorePropertiesDialog}
          onCommentsChange={updateStorePropertiesComments}
          onCommerceChange={updateStorePropertiesCommerce}
          onScriptResRefsChange={updateStorePropertiesScriptResRefs}
          onVariablesChange={updateStorePropertiesVariables}
          itemBaseItemCatalog={sceneHistory.present.itemBaseItemCatalog ?? null}
          onRestrictionsChange={updateStorePropertiesRestrictions}
          onInventoryChange={updateStorePropertiesInventory}
          onApply={applyStorePropertiesDialog}
          onHeaderPointerDown={startStorePropertiesDialogDrag}
          onHeaderPointerMove={moveStorePropertiesDialogDrag}
          onHeaderPointerUp={endStorePropertiesDialogDrag}
          onHeaderPointerCancel={cancelStorePropertiesDialogDrag}
        />
      ) : null}

      {placeablePropertiesDialog ? (
        <PlaceablePropertiesDialog
          placeablePropertiesDialog={placeablePropertiesDialog}
          placeableRenderPayload={
            placeableRenderPayloadByObjectId?.[placeablePropertiesDialog.objectId] ?? null
          }
          placeablePropertiesDialogRef={placeablePropertiesDialogRef}
          placeableAppearanceCatalog={
            placeableAppearanceCatalogState?.objectId === placeablePropertiesDialog.objectId
              ? placeableAppearanceCatalogState.catalog
              : null
          }
          placeableAppearanceCatalogStatus={
            placeableAppearanceCatalogState?.objectId === placeablePropertiesDialog.objectId
              ? placeableAppearanceCatalogState.status
              : "unavailable"
          }
          placeableTrapTypeCatalog={sceneHistory.present.placeableTrapTypeCatalog ?? null}
          placeableBodyBagCatalog={sceneHistory.present.placeableBodyBagCatalog ?? null}
          placeablePortraitCatalog={sceneHistory.present.placeablePortraitCatalog ?? null}
          placeableFactionCatalog={sceneHistory.present.placeableFactionCatalog ?? null}
          onPlaceableAppearanceSearch={(query) => {
            void loadPlaceableAppearanceCatalogForDialog(
              placeablePropertiesDialog.snapshotObject,
              query,
              placeablePropertiesDialog.draft.appearanceType
            );
          }}
          togglePlaceablePropertiesDialogCollapsed={togglePlaceablePropertiesDialogCollapsed}
          cancelPlaceablePropertiesDialog={cancelPlaceablePropertiesDialog}
          setPlaceablePropertiesActiveTab={setPlaceablePropertiesActiveTab}
          updatePlaceablePropertiesDraftField={updatePlaceablePropertiesDraftField}
          updatePlaceableScriptSlotDraftField={updatePlaceableScriptSlotDraftField}
          updatePlaceableDisabledFlagDraftField={updatePlaceableDisabledFlagDraftField}
          updatePlaceableLockDraftField={updatePlaceableLockDraftField}
          updatePlaceableTrapDraftField={updatePlaceableTrapDraftField}
          updatePlaceableAdvancedDraftField={updatePlaceableAdvancedDraftField}
          addPlaceableInventoryItem={addPlaceableInventoryItem}
          updatePlaceableInventoryItem={updatePlaceableInventoryItem}
          movePlaceableInventoryItem={movePlaceableInventoryItem}
          removePlaceableInventoryItem={removePlaceableInventoryItem}
          addPlaceableVariable={addPlaceableVariable}
          updatePlaceableVariable={updatePlaceableVariable}
          movePlaceableVariable={movePlaceableVariable}
          removePlaceableVariable={removePlaceableVariable}
          applyPlaceablePropertiesDraft={applyPlaceablePropertiesDraft}
          startPlaceablePropertiesDialogDrag={startPlaceablePropertiesDialogDrag}
          movePlaceablePropertiesDialogDrag={movePlaceablePropertiesDialogDrag}
          endPlaceablePropertiesDialogDrag={endPlaceablePropertiesDialogDrag}
          cancelPlaceablePropertiesDialogDrag={cancelPlaceablePropertiesDialogDrag}
        />
      ) : null}

      {creaturePropertiesDialog ? (
        <CreaturePropertiesDialog
          creaturePropertiesDialog={creaturePropertiesDialog}
          creatureBodyBagCatalog={sceneHistory.present.placeableBodyBagCatalog ?? null}
          creatureFactionCatalog={sceneHistory.present.placeableFactionCatalog ?? null}
          creatureAppearanceCatalog={
            creatureAppearanceCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureAppearanceCatalogState.catalog
              : null
          }
          creatureAppearanceCatalogStatus={
            creatureAppearanceCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureAppearanceCatalogState.status
              : "unavailable"
          }
          creatureAppearanceCatalogError={
            creatureAppearanceCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureAppearanceCatalogState.errorMessage
              : null
          }
          onCreatureAppearanceSearch={(query) => {
            void loadCreatureAppearanceCatalogForDialog(
              creaturePropertiesDialog.snapshotObject,
              query,
              creaturePropertiesDialog.draft.appearanceType,
            );
          }}
          creatureGenderCatalog={
            creatureGenderCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureGenderCatalogState.catalog
              : null
          }
          creatureGenderCatalogStatus={
            creatureGenderCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureGenderCatalogState.status
              : "unavailable"
          }
          creatureGenderCatalogError={
            creatureGenderCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureGenderCatalogState.errorMessage
              : null
          }
          onCreatureGenderSearch={(query) => {
            void loadCreatureGenderCatalogForDialog(
              creaturePropertiesDialog.snapshotObject,
              query,
              creaturePropertiesDialog.draft.genderId,
            );
          }}
          creatureWingsCatalog={
            creatureWingsCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureWingsCatalogState.catalog
              : null
          }
          creatureWingsCatalogStatus={
            creatureWingsCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureWingsCatalogState.status
              : "unavailable"
          }
          creatureWingsCatalogError={
            creatureWingsCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureWingsCatalogState.errorMessage
              : null
          }
          onCreatureWingsSearch={(query) => {
            const selectedRowIndex = Number(creaturePropertiesDialog.draft.appearanceParts.wings);
            void loadCreatureAppendageCatalogForDialog(
              creaturePropertiesDialog.snapshotObject,
              "wings",
              query,
              Number.isSafeInteger(selectedRowIndex) ? selectedRowIndex : undefined,
            );
          }}
          creatureTailCatalog={
            creatureTailCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureTailCatalogState.catalog
              : null
          }
          creatureTailCatalogStatus={
            creatureTailCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureTailCatalogState.status
              : "unavailable"
          }
          creatureTailCatalogError={
            creatureTailCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureTailCatalogState.errorMessage
              : null
          }
          onCreatureTailSearch={(query) => {
            const selectedRowIndex = Number(creaturePropertiesDialog.draft.appearanceParts.tail);
            void loadCreatureAppendageCatalogForDialog(
              creaturePropertiesDialog.snapshotObject,
              "tail",
              query,
              Number.isSafeInteger(selectedRowIndex) ? selectedRowIndex : undefined,
            );
          }}
          creaturePerceptionRangeCatalog={
            creaturePerceptionRangeCatalogState?.objectId ===
              creaturePropertiesDialog.objectId
              ? creaturePerceptionRangeCatalogState.catalog
              : null
          }
          creaturePerceptionRangeCatalogStatus={
            creaturePerceptionRangeCatalogState?.objectId ===
              creaturePropertiesDialog.objectId
              ? creaturePerceptionRangeCatalogState.status
              : "unavailable"
          }
          creaturePerceptionRangeCatalogError={
            creaturePerceptionRangeCatalogState?.objectId ===
              creaturePropertiesDialog.objectId
              ? creaturePerceptionRangeCatalogState.errorMessage
              : null
          }
          onCreaturePerceptionRangeSearch={(query) => {
            void loadCreaturePerceptionRangeCatalogForDialog(
              creaturePropertiesDialog.snapshotObject,
              query,
              creaturePropertiesDialog.draft.advancedSettings.perceptionRangeId,
            );
          }}
          creatureWalkRateCatalog={
            creatureWalkRateCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureWalkRateCatalogState.catalog
              : null
          }
          creatureWalkRateCatalogStatus={
            creatureWalkRateCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureWalkRateCatalogState.status
              : "unavailable"
          }
          creatureWalkRateCatalogError={
            creatureWalkRateCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureWalkRateCatalogState.errorMessage
              : null
          }
          onCreatureWalkRateSearch={(query) => {
            void loadCreatureWalkRateCatalogForDialog(
              creaturePropertiesDialog.snapshotObject,
              query,
              creaturePropertiesDialog.draft.advancedSettings.walkRateId,
            );
          }}
          creatureSoundSetCatalog={
            creatureSoundSetCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureSoundSetCatalogState.catalog
              : null
          }
          creatureSoundSetCatalogStatus={
            creatureSoundSetCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureSoundSetCatalogState.status
              : "unavailable"
          }
          creatureSoundSetCatalogError={
            creatureSoundSetCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureSoundSetCatalogState.errorMessage
              : null
          }
          onCreatureSoundSetSearch={(query) => {
            void loadCreatureSoundSetCatalogForDialog(
              creaturePropertiesDialog.snapshotObject,
              query,
              creaturePropertiesDialog.draft.advancedSettings.soundSetFile,
            );
          }}
          creatureStartingPackageCatalog={
            creatureStartingPackageCatalogState?.objectId ===
              creaturePropertiesDialog.objectId
              ? creatureStartingPackageCatalogState.catalog
              : null
          }
          creatureStartingPackageCatalogStatus={
            creatureStartingPackageCatalogState?.objectId ===
              creaturePropertiesDialog.objectId
              ? creatureStartingPackageCatalogState.status
              : "unavailable"
          }
          creatureStartingPackageCatalogError={
            creatureStartingPackageCatalogState?.objectId ===
              creaturePropertiesDialog.objectId
              ? creatureStartingPackageCatalogState.errorMessage
              : null
          }
          onCreatureStartingPackageSearch={(query) => {
            const provenance = readExistingCreatureClassIdentityProvenance(
              creaturePropertiesDialog.snapshotObject.source,
            );
            const targetClassIds = creaturePropertiesDialog.draft.classEntries.flatMap(
              (entry) => Number.isSafeInteger(entry.classId) ? [Number(entry.classId)] : [],
            );
            const changed = provenance !== null &&
              targetClassIds.length === provenance.sourceClassIds.length &&
              targetClassIds.some((classId, index) =>
                classId !== provenance.sourceClassIds[index]);
            void loadCreatureStartingPackageCatalogForDialog(
              creaturePropertiesDialog.snapshotObject,
              query,
              creaturePropertiesDialog.draft.advancedSettings.startingPackageId,
              changed ? targetClassIds : undefined,
            );
          }}
          creatureClassCatalog={
            creatureClassCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureClassCatalogState.catalog
              : null
          }
          creatureClassCatalogStatus={
            creatureClassCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureClassCatalogState.status
              : "unavailable"
          }
          creatureClassCatalogError={
            creatureClassCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureClassCatalogState.errorMessage
              : null
          }
          onCreatureClassSearch={(query) => {
            const selected = creaturePropertiesDialog.draft.classEntries.flatMap(
              (entry) => Number.isSafeInteger(entry.classId) ? [Number(entry.classId)] : [],
            );
            void loadCreatureClassCatalogForDialog(
              creaturePropertiesDialog.snapshotObject,
              query,
              selected,
            );
          }}
          creatureSkillCatalog={
            creatureSkillCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureSkillCatalogState.catalog
              : null
          }
          creatureSkillCatalogStatus={
            creatureSkillCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureSkillCatalogState.status
              : "unavailable"
          }
          creatureSkillCatalogError={
            creatureSkillCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureSkillCatalogState.errorMessage
              : null
          }
          creatureFeatCatalog={
            creatureFeatCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureFeatCatalogState.catalog
              : null
          }
          creatureFeatCatalogStatus={
            creatureFeatCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureFeatCatalogState.status
              : "unavailable"
          }
          creatureFeatCatalogError={
            creatureFeatCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureFeatCatalogState.errorMessage
              : null
          }
          creatureSpecialAbilityCatalog={
            creatureSpecialAbilityCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureSpecialAbilityCatalogState.catalog
              : null
          }
          creatureSpecialAbilityCatalogStatus={
            creatureSpecialAbilityCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureSpecialAbilityCatalogState.status
              : "unavailable"
          }
          creatureSpecialAbilityCatalogError={
            creatureSpecialAbilityCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creatureSpecialAbilityCatalogState.errorMessage
              : null
          }
          creaturePhenotypeCatalog={
            creaturePhenotypeCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creaturePhenotypeCatalogState.catalog
              : null
          }
          creaturePhenotypeCatalogStatus={
            creaturePhenotypeCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creaturePhenotypeCatalogState.status
              : "unavailable"
          }
          creaturePhenotypeCatalogError={
            creaturePhenotypeCatalogState?.objectId === creaturePropertiesDialog.objectId
              ? creaturePhenotypeCatalogState.errorMessage
              : null
          }
          creaturePortraitCatalog={sceneHistory.present.creaturePortraitCatalog ?? null}
          onCreaturePhenotypeSearch={(query) => {
            void loadCreaturePhenotypeCatalogForDialog(
              creaturePropertiesDialog.snapshotObject,
              query,
              creaturePropertiesDialog.draft.phenotypeId,
            );
          }}
          creaturePropertiesDialogRef={creaturePropertiesDialogRef}
          toggleCreaturePropertiesDialogCollapsed={toggleCreaturePropertiesDialogCollapsed}
          cancelCreaturePropertiesDialog={cancelCreaturePropertiesDialog}
          setCreaturePropertiesActiveTab={setCreaturePropertiesActiveTab}
          updateCreaturePropertiesDraftField={updateCreaturePropertiesDraftField}
          updateCreatureClassEntry={updateCreatureClassEntry}
          appendCreatureClassSlot={appendCreatureClassSlot}
          truncateCreatureClassSlot={truncateCreatureClassSlot}
          updateCreatureSkillRank={updateCreatureSkillRank}
          updateCreatureFeatAssigned={updateCreatureFeatAssigned}
          updateCreatureSpecialAbility={updateCreatureSpecialAbility}
          updateCreatureScriptSlot={updateCreatureScriptSlot}
          updateCreatureAppearancePart={updateCreatureAppearancePart}
          updateCreatureAppearanceSourceOnlyPart={updateCreatureAppearanceSourceOnlyPart}
          updateCreatureAppearanceColor={updateCreatureAppearanceColor}
          updateCreatureAdvancedField={updateCreatureAdvancedField}
          addCreatureVariable={addCreatureVariable}
          updateCreatureVariable={updateCreatureVariable}
          moveCreatureVariable={moveCreatureVariable}
          removeCreatureVariable={removeCreatureVariable}
          addCreatureInventoryItem={addCreatureInventoryItem}
          updateCreatureInventoryItem={updateCreatureInventoryItem}
          moveCreatureInventoryItem={moveCreatureInventoryItem}
          removeCreatureInventoryItem={removeCreatureInventoryItem}
          updateCreatureEquipmentItem={updateCreatureEquipmentItem}
          removeCreatureEquipmentItem={removeCreatureEquipmentItem}
          creatureResourceOptions={creatureResourceOptions}
          applyCreaturePropertiesDraft={applyCreaturePropertiesDraft}
          creatureFeatsFilter={creatureFeatsFilter}
          setCreatureFeatsFilter={setCreatureFeatsFilter}
          creatureSpellsLevelFilter={creatureSpellsLevelFilter}
          setCreatureSpellsLevelFilter={setCreatureSpellsLevelFilter}
          creatureSpellsMetaMagicFilter={creatureSpellsMetaMagicFilter}
          setCreatureSpellsMetaMagicFilter={setCreatureSpellsMetaMagicFilter}
          creatureSpellsClassFilterIndex={creatureSpellsClassFilterIndex}
          setCreatureSpellsClassFilterIndex={setCreatureSpellsClassFilterIndex}
          creatureSpecialAbilitiesFilter={creatureSpecialAbilitiesFilter}
          setCreatureSpecialAbilitiesFilter={setCreatureSpecialAbilitiesFilter}
          startCreaturePropertiesDialogDrag={startCreaturePropertiesDialogDrag}
          moveCreaturePropertiesDialogDrag={moveCreaturePropertiesDialogDrag}
          endCreaturePropertiesDialogDrag={endCreaturePropertiesDialogDrag}
          cancelCreaturePropertiesDialogDrag={cancelCreaturePropertiesDialogDrag}
        />
      ) : null}

      {itemPropertiesDialog ? (
        <ItemPropertiesDialog
          itemPropertiesDialog={itemPropertiesDialog}
          itemPropertiesDialogRef={itemPropertiesDialogRef}
          toggleItemPropertiesDialogCollapsed={toggleItemPropertiesDialogCollapsed}
          cancelItemPropertiesDialog={cancelItemPropertiesDialog}
          setItemPropertiesActiveTab={setItemPropertiesActiveTab}
          updateItemPropertiesDraftField={updateItemPropertiesDraftField}
          updateItemArmorContextDraftField={updateItemArmorContextDraftField}
          updateItemArmorPartDraftField={updateItemArmorPartDraftField}
          updateItemMaterialColorDraftField={updateItemMaterialColorDraftField}
          addItemPropertyEntry={addItemPropertyEntry}
          updateItemPropertyEntry={updateItemPropertyEntry}
          moveItemPropertyEntry={moveItemPropertyEntry}
          removeItemPropertyEntry={removeItemPropertyEntry}
          updateItemInventoryCoordinate={updateItemInventoryCoordinate}
          moveItemInventoryEntry={moveItemInventoryEntry}
          removeItemInventoryEntry={removeItemInventoryEntry}
          itemInventoryBlueprintOptions={itemInventoryBlueprintOptions}
          addItemInventoryBlueprintEntry={addItemInventoryBlueprintEntry}
          addItemBlueprintInventoryEntry={addItemBlueprintInventoryEntry}
          updateItemBlueprintInventoryEntry={updateItemBlueprintInventoryEntry}
          moveItemBlueprintInventoryEntry={moveItemBlueprintInventoryEntry}
          removeItemBlueprintInventoryEntry={removeItemBlueprintInventoryEntry}
          addItemBlueprintEquipmentEntry={addItemBlueprintEquipmentEntry}
          updateItemBlueprintEquipmentEntry={updateItemBlueprintEquipmentEntry}
          removeItemBlueprintEquipmentEntry={removeItemBlueprintEquipmentEntry}
          addItemVariable={addItemVariable}
          updateItemVariable={updateItemVariable}
          moveItemVariable={moveItemVariable}
          removeItemVariable={removeItemVariable}
          applyItemPropertiesDraft={applyItemPropertiesDraft}
          itemAssetAccessToken={placeableAssetAccessToken}
          itemBaseItemCatalog={sceneHistory.present.itemBaseItemCatalog ?? null}
          startItemPropertiesDialogDrag={startItemPropertiesDialogDrag}
          moveItemPropertiesDialogDrag={moveItemPropertiesDialogDrag}
          endItemPropertiesDialogDrag={endItemPropertiesDialogDrag}
          cancelItemPropertiesDialogDrag={cancelItemPropertiesDialogDrag}
        />
      ) : null}

      {soundPropertiesDialog ? (
        <SoundPropertiesDialog
          soundPropertiesDialog={soundPropertiesDialog}
          soundPropertiesDialogRef={soundPropertiesDialogRef}
          toggleSoundPropertiesDialogCollapsed={toggleSoundPropertiesDialogCollapsed}
          cancelSoundPropertiesDialog={cancelSoundPropertiesDialog}
          setSoundPropertiesActiveTab={setSoundPropertiesActiveTab}
          updateSoundPropertiesDraftField={updateSoundPropertiesDraftField}
          patchSoundPropertiesDraft={patchSoundPropertiesDraft}
          toggleSoundPropertiesActive={toggleSoundPropertiesActive}
          setSoundWhenToPlay={setSoundWhenToPlay}
          toggleSoundHour={toggleSoundHour}
          selectSoundListEntry={selectSoundListEntry}
          playSelectedSoundPreview={playSelectedSoundPreview}
          stopSoundPreviewPlayback={stopSoundPreviewPlayback}
          addSoundListEntry={addSoundListEntry}
          removeSelectedSoundListEntry={removeSelectedSoundListEntry}
          moveSoundListEntryUp={moveSoundListEntryUp}
          moveSoundListEntryDown={moveSoundListEntryDown}
          applySoundPropertiesDraft={applySoundPropertiesDraft}
          soundCatalogResRefs={soundCatalogResRefs}
          startSoundPropertiesDialogDrag={startSoundPropertiesDialogDrag}
          moveSoundPropertiesDialogDrag={moveSoundPropertiesDialogDrag}
          endSoundPropertiesDialogDrag={endSoundPropertiesDialogDrag}
          cancelSoundPropertiesDialogDrag={cancelSoundPropertiesDialogDrag}
        />
      ) : null}

      {doorPropertiesDialog ? (
        <DoorPropertiesDialog
          doorPropertiesDialog={doorPropertiesDialog}
          doorRenderPayload={
            placeableRenderPayloadByObjectId?.[doorPropertiesDialog.objectId] ?? null
          }
          doorPropertiesDialogRef={doorPropertiesDialogRef}
          toggleDoorPropertiesDialogCollapsed={toggleDoorPropertiesDialogCollapsed}
          cancelDoorPropertiesDialog={cancelDoorPropertiesDialog}
          setDoorPropertiesActiveTab={setDoorPropertiesActiveTab}
          updateDoorPropertiesDraftField={updateDoorPropertiesDraftField}
          updateDoorLockDraftField={updateDoorLockDraftField}
          updateDoorTrapDraftField={updateDoorTrapDraftField}
          updateDoorScriptSlotDraftField={updateDoorScriptSlotDraftField}
          updateDoorAdvancedDraftField={updateDoorAdvancedDraftField}
          updateDoorTransitionDraftField={updateDoorTransitionDraftField}
          applyDoorPropertiesDraft={applyDoorPropertiesDraft}
          startDoorPropertiesDialogDrag={startDoorPropertiesDialogDrag}
          moveDoorPropertiesDialogDrag={moveDoorPropertiesDialogDrag}
          endDoorPropertiesDialogDrag={endDoorPropertiesDialogDrag}
          cancelDoorPropertiesDialogDrag={cancelDoorPropertiesDialogDrag}
        />
      ) : null}

      {toolbarState.canvasDebug.runtimeHud ? (
        <aside
          className={`canvas-runtime-anchor ${runtimePopupPinned ? "is-pinned" : ""}`}
          aria-label="canvas runtime"
          style={{ right: `${hudRightPx}px`, maxWidth: hudMaxWidth }}
        >
          <button
            type="button"
            className="canvas-runtime-chip"
            aria-label="Runtime diagnostics"
            aria-pressed={runtimePopupPinned}
            onClick={() => setRuntimePopupPinned((current) => !current)}
          >
            <span className="canvas-runtime-chip-icon" aria-hidden="true">
              i
            </span>
            <span>Runtime</span>
          </button>
          <article className="canvas-runtime-popup" role="tooltip" aria-label="runtime diagnostics panel">
            <p>
              Controls: <strong>{controlPresetLabel}</strong>
            </p>
            <p>
              Runtime: <strong>{webglReady ? "Three.js / WebGL" : "Fallback"}</strong>
            </p>
            {webglFallbackReason ? (
              <p>
                Status: <strong>{webglFallbackReason}</strong>
              </p>
            ) : null}
            <p>
              Scene: <strong>{scene.areaName}</strong>
            </p>
            <p>
              Source: <strong>{scene.source}</strong>
            </p>
            <p>
              Tile source:{" "}
              <strong>
                {scene.tileSource?.type ?? "unknown"}
                {scene.tileSource?.tilesetResRef ? ` / ${scene.tileSource.tilesetResRef}` : ""}
                {scene.tileSource?.fallbackReason
                  ? ` / not Aurora-render-correct: ${scene.tileSource.fallbackReason}`
                  : ""}
              </strong>
            </p>
            <p>
              Tile render:{" "}
              <strong>
                {terrainRenderStatus.label} / runtime{" "}
                {formatTerrainTileModelRuntimeStatus(terrainTileModelRuntimeSnapshot)}
              </strong>
            </p>
            <p>
              Scene package: <strong>{terrainScenePackageReadiness.status}</strong>
            </p>
            <p>
              Tile assets:{" "}
              <strong>
                ARE {terrainScenePackageReadiness.areTileListStatus} / SET{" "}
                {terrainScenePackageReadiness.setTileModelStatus} / MDL{" "}
                {terrainScenePackageReadiness.mdlAvailabilityStatus} / GLB{" "}
                {terrainScenePackageReadiness.glbAvailabilityStatus} / texture{" "}
                {terrainScenePackageReadiness.textureAvailabilityStatus}
              </strong>
            </p>
            <p>
              Tile blockers:{" "}
              <strong>
                {terrainScenePackageReadiness.blockers.length > 0
                  ? terrainScenePackageReadiness.blockers.join(", ")
                  : "none"}
              </strong>
            </p>
            <p>
              Tile asset contract:{" "}
              <strong>{terrainScenePackageReadiness.tileAssetContractStatus}</strong>
            </p>
            <p>
              Tile catalog candidates:{" "}
              <strong>
                {terrainScenePackageReadiness.tileCatalogCandidateIdsSample || "none"}
              </strong>
            </p>
            <p>
              Tile process:{" "}
              <strong>{terrainScenePackageReadiness.tileProcessContractStatus}</strong>
            </p>
            <p>
              Tile process runtime:{" "}
              <strong>
                {formatAreaTileProcessRuntimeStatus(areaTileProcessReadiness)}
              </strong>
            </p>
            <p>
              Tile process source:{" "}
              <strong>
                {areaTileProcessReadiness?.sourceObjectKeySample ?? "not checked"}
              </strong>
            </p>
            <p>
              Tile process runtime blockers:{" "}
              <strong>{areaTileProcessReadiness?.blockerSummary ?? "not checked"}</strong>
            </p>
            <p>
              Tile texture/material blockers:{" "}
              <strong>
                {areaTileProcessReadiness?.textureMaterialBlockerSummary ?? "not checked"}
              </strong>
            </p>
            <p>
              Tile model loader:{" "}
              <strong>
                {formatAreaTileModelLoaderRuntimeStatus(areaTileProcessReadiness)}
              </strong>
            </p>
            <p>
              Tile texture contract:{" "}
              <strong>{terrainScenePackageReadiness.tileTextureContractStatus}</strong>
            </p>
            <p>
              Tile asset blockers:{" "}
              <strong>
                {terrainScenePackageReadiness.tileAssetContractBlockers.length > 0
                  ? terrainScenePackageReadiness.tileAssetContractBlockers.join(", ")
                  : "none"}
              </strong>
            </p>
            <p>
              Area PLC/DOR renderer:{" "}
              <strong>
                {areaObjectSharedRendererDiagnostics.status} / payload{" "}
                {areaObjectSharedRendererDiagnostics.payloadReadyCount}/
                {areaObjectSharedRendererDiagnostics.total} / model{" "}
                {areaObjectSharedRendererDiagnostics.modelUrlReadyCount}/
                {areaObjectSharedRendererDiagnostics.total} /{" "}
                {formatAreaSharedRendererIssueSummary(areaObjectSharedRendererDiagnostics, {
                  payloadRequestsInFlight: hasAreaPayloadRequestsInFlight
                })}
              </strong>
            </p>
            <p>
              Selection: <strong>{selectedSummary}</strong>
            </p>
            <p>
              Debug map: <strong>{toolbarState.canvasDebug.statusMap}</strong>
            </p>
            <p>
              Overlays:{" "}
              <strong>
                walkmesh {toolbarState.canvasDebug.walkmeshOverlay ? "on" : "off"} / collision{" "}
                {toolbarState.canvasDebug.collisionOverlay ? "on" : "off"}
              </strong>
            </p>
            <p>
              Texture mode: <strong>{toolbarState.canvasDebug.textureCompression}</strong>
            </p>
            <p>
              Gizmo: <strong>{toolbarState.canvasDebug.gizmoMode}</strong>
            </p>
            <p>
              VT physical:{" "}
              <strong>{toolbarState.canvasDebug.showVtPhysicalAnchor ? "on" : "off"}</strong>
            </p>
            <p>
              Snap: <strong>{snapSummary || "off"}</strong>
            </p>
            <p>
              Snap step:{" "}
              <strong>
                grid {workspaceOptions.snapGridStep} / angle {workspaceOptions.snapAngleStepDeg}
                deg / height {workspaceOptions.snapHeightStep}
              </strong>
            </p>
            <p>
              Box mode: <strong>{workspaceOptions.selectionBoxMode}</strong>
            </p>
            <p>
              Per-object gizmo hints:{" "}
              <strong>{workspaceOptions.showPerObjectGizmoHints ? "on" : "off"}</strong>
            </p>
            <p>
              Isolate: <strong>{isolateSummary}</strong>
            </p>
            <p>
              Locked: <strong>{lockSummary}</strong>
            </p>
            <p>
              Bookmark #1: <strong>{bookmarkSaved ? "saved" : "empty"}</strong>
            </p>
            <p>
              Non-render objs: <strong>{nonRenderCount}</strong>
            </p>
            <p>
              Draft: <strong>{saveStatus}</strong>
            </p>
            {toolbarState.canvasDebug.perfHud ? (
              <>
                <p>
                  FPS: <strong>{perfSnapshot.fps}</strong>
                </p>
                <p>
                  Draw calls: <strong>{perfSnapshot.drawCalls}</strong>
                </p>
                <p>
                  Triangles: <strong>{perfSnapshot.triangles}</strong>
                </p>
                <p>
                  GPU mem: <strong>geo {perfSnapshot.geometries} / tex {perfSnapshot.textures}</strong>
                </p>
              </>
            ) : null}
          </article>
        </aside>
      ) : null}

      {objectAddDropFeedback ? (
        <aside
          className={`canvas-object-add-drop-feedback canvas-object-add-drop-feedback-${objectAddDropFeedback.variant}`}
          role="status"
          aria-live="polite"
          style={{ left: `${hudLeftPx}px`, maxWidth: hudMaxWidth }}
        >
          {objectAddDropFeedback.message}
        </aside>
      ) : objectAddPlacementMode ? (
        <aside
          className="canvas-object-add-drop-feedback canvas-object-add-placement-prompt canvas-object-add-drop-feedback-success"
          role="status"
          aria-live="polite"
          aria-label="object placement mode"
          style={{ left: `${hudLeftPx}px`, maxWidth: hudMaxWidth }}
        >
          <span>
            Placing {objectAddPlacementMode.template.tag}: click tiles to add more.
          </span>
          <button
            type="button"
            className="canvas-object-add-placement-done-btn"
            onClick={() => placeObjectAddAtSceneCenter()}
          >
            Place center
          </button>
          <button
            type="button"
            className="canvas-object-add-placement-done-btn"
            onClick={() => cancelObjectAddPlacement("manual")}
          >
            Stop placing
          </button>
        </aside>
      ) : null}

      {visualTransformBlockedReason ? (
        <aside
          className="canvas-vt-blocked-note"
          role="note"
          aria-label="visual transform blocked info"
          style={{ right: `${hudRightPx}px`, maxWidth: hudMaxWidth }}
        >
          {visualTransformBlockedReason}
        </aside>
      ) : null}

      {toolbarState.canvasDebug.controlsHint ? (
        <aside
          className="canvas-controls-hint"
          role="note"
          aria-label="controls hint"
          style={{
            left: `${hudLeftPx}px`,
            bottom: `${controlsHintBottomPx}px`,
            maxWidth: hudMaxWidth
          }}
        >
          <button type="button" className="canvas-controls-hint-chip" aria-label="Controls help">
            <span className="canvas-controls-hint-icon" aria-hidden="true">
              i
            </span>
            <span>Controls</span>
          </button>
          <div className="canvas-controls-hint-popup" role="tooltip">
            {inputHint}
          </div>
        </aside>
      ) : null}
    </section>
  );
}





