import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildPlaceablePropertiesDraft } from "../../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { PlaceablePropertiesDialog } from "../../../../../../src/modules/layout/components/properties/PlaceablePropertiesDialog";
import { createNewSceneObject } from "../../../../../../src/modules/scene/domain/sceneFactory";
import type {
  SceneObjectPlaceableLocalizedStrings,
  SceneObjectPlaceableScriptSlots
} from "../../../../../../src/modules/scene/contracts";

function renderInventoryDialog(options?: { provenInventory?: boolean; emptyInventory?: boolean }) {
  const placeableObject = createNewSceneObject("placeables", 1, 2, 3);
  if (!placeableObject.placeableProperties) {
    throw new Error("Expected placeable defaults");
  }
  placeableObject.source = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceObjectId: "plc:0:plc_flrlever1:source",
    ...(options?.provenInventory === false
      ? {}
      : {
          placeableInventoryItems: [
            { sourceIndex: 0, resRef: "s03proofamuletr2", x: 3, y: 4 }
          ]
        })
  };
  placeableObject.placeableProperties = {
    ...placeableObject.placeableProperties,
    hasInventory: true,
    inventoryItems: [
      {
        sourceIndex: 0,
        resRef: "s03proofamuletr2",
        x: 3,
        y: 4
      },
      {
        resRef: "nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
        itemSourceFingerprint:
          "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
        x: 7,
        y: 8
      }
    ]
  };
  if (options?.emptyInventory) {
    placeableObject.source.placeableInventoryItems = [];
    placeableObject.placeableProperties.inventoryItems = [];
  }

  const handlers = {
    addPlaceableInventoryItem: vi.fn(),
    updatePlaceableInventoryItem: vi.fn(),
    movePlaceableInventoryItem: vi.fn(),
    removePlaceableInventoryItem: vi.fn()
  };

  render(
    <PlaceablePropertiesDialog
      placeablePropertiesDialog={{
        objectId: placeableObject.id,
        snapshotObject: placeableObject,
        draft: buildPlaceablePropertiesDraft(placeableObject),
        activeTab: "inventory",
        windowX: 20,
        windowY: 20,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false
      }}
      togglePlaceablePropertiesDialogCollapsed={vi.fn()}
      cancelPlaceablePropertiesDialog={vi.fn()}
      setPlaceablePropertiesActiveTab={vi.fn()}
      updatePlaceablePropertiesDraftField={vi.fn()}
      updatePlaceableScriptSlotDraftField={vi.fn()}
      updatePlaceableDisabledFlagDraftField={vi.fn()}
      updatePlaceableLockDraftField={vi.fn()}
      updatePlaceableTrapDraftField={vi.fn()}
      updatePlaceableAdvancedDraftField={vi.fn()}
      applyPlaceablePropertiesDraft={vi.fn()}
      {...handlers}
    />
  );

  return handlers;
}

function renderScriptsDialog(options: {
  provenOnUsed: boolean;
  provenScripts?: Partial<Omit<SceneObjectPlaceableScriptSlots, "onUsed">>;
  sourceType?: "seed" | "aurora_git" | "aurora_blueprint";
  sourceKind?: "placeable" | "creature";
}) {
  const placeableObject = createNewSceneObject("placeables", 1, 2, 3);
  placeableObject.source = {
    type: options.sourceType ?? "aurora_git",
    sourceKind: options.sourceKind ?? "placeable",
    sourceObjectId: "obj_plc_probe",
    ...(options.provenOnUsed ? { placeableOnUsed: "" } : {}),
    ...(options.provenScripts ? { placeableScriptResRefs: options.provenScripts } : {})
  };
  const onChange = vi.fn();
  render(
    <PlaceablePropertiesDialog
      placeablePropertiesDialog={{
        objectId: placeableObject.id,
        snapshotObject: placeableObject,
        draft: buildPlaceablePropertiesDraft(placeableObject),
        activeTab: "scripts",
        windowX: 20,
        windowY: 20,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false
      }}
      togglePlaceablePropertiesDialogCollapsed={vi.fn()}
      cancelPlaceablePropertiesDialog={vi.fn()}
      setPlaceablePropertiesActiveTab={vi.fn()}
      updatePlaceablePropertiesDraftField={vi.fn()}
      updatePlaceableScriptSlotDraftField={onChange}
      updatePlaceableDisabledFlagDraftField={vi.fn()}
      updatePlaceableLockDraftField={vi.fn()}
      updatePlaceableTrapDraftField={vi.fn()}
      updatePlaceableAdvancedDraftField={vi.fn()}
      addPlaceableInventoryItem={vi.fn()}
      updatePlaceableInventoryItem={vi.fn()}
      movePlaceableInventoryItem={vi.fn()}
      removePlaceableInventoryItem={vi.fn()}
      applyPlaceablePropertiesDraft={vi.fn()}
    />
  );
  return onChange;
}

function renderBasicDialog(options: {
  provenStatic?: boolean;
  provenUseable?: boolean;
  provenPlot?: boolean;
  provenHasInventory?: boolean;
  provenDurabilitySaveBytes?: Partial<{
    hardness: number;
    fortitudeSave: number;
    reflexSave: number;
    willSave: number;
  }>;
  provenHitPointState?: {
    hitPoints: number;
    currentHitPoints: number;
  };
  sourceAppearanceType?: number;
  sourceAppearanceNativeType?: "dword" | "byte";
  sourceAppearanceTable?: boolean;
  appearanceCatalog?: {
    tableSha256: string;
    rowCount: number;
    query: string;
    items: Array<{
      rowIndex: number;
      displayName: string;
      displaySource: "strref" | "label" | "row_index";
    }>;
  };
  appearanceCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  draftAppearanceType?: number;
  onAppearanceSearch?: (query: string) => void;
  sourceType?: "seed" | "aurora_git" | "aurora_blueprint";
  sourceKind?: "placeable" | "creature";
  sourceIndex?: number;
  sourceTag?: string;
  provenLocalizedStrings?: SceneObjectPlaceableLocalizedStrings;
  localizedNameTarget?: string;
} = {}) {
  const placeableObject = createNewSceneObject("placeables", 1, 2, 3);
  placeableObject.source = {
    type: options.sourceType ?? "aurora_git",
    sourceKind: options.sourceKind ?? "placeable",
    sourceObjectId: "obj_plc_probe",
    ...(options.sourceIndex !== undefined ? { sourceIndex: options.sourceIndex } : {}),
    ...(options.provenStatic ? { placeableStatic: true } : {}),
    ...(options.provenUseable ? { placeableUseable: false } : {}),
    ...(options.provenPlot ? { placeablePlot: false } : {}),
    ...(options.provenHasInventory ? { placeableHasInventory: false } : {}),
    ...(options.provenDurabilitySaveBytes
      ? { placeableDurabilitySaveBytes: options.provenDurabilitySaveBytes }
      : {}),
    ...(options.provenHitPointState
      ? { placeableHitPointState: options.provenHitPointState }
      : {}),
    ...(options.provenLocalizedStrings
      ? { placeableLocalizedStrings: options.provenLocalizedStrings }
      : {}),
    ...(options.sourceAppearanceType !== undefined || options.sourceTag !== undefined
      ? {
          appearanceType: options.sourceAppearanceType,
          placeableBasicIdentity: {
            tag: options.sourceTag !== undefined
              ? { present: true as const, value: options.sourceTag }
              : { present: false } as const,
            appearance: options.sourceAppearanceType !== undefined
              ? {
                  present: true as const,
                  nativeType: options.sourceAppearanceNativeType ?? "dword",
                  value: options.sourceAppearanceType,
                  ...(options.sourceAppearanceTable &&
                  (options.sourceAppearanceNativeType ?? "dword") === "dword"
                    ? {
                        table: {
                          resourceName: "placeables.2da" as const,
                          sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
                          sourceLayer: "hak" as const,
                          sha256: "a".repeat(64),
                          sizeBytes: 8192,
                          rowCount: 400,
                          rowIndex: options.sourceAppearanceType
                        }
                      }
                    : {})
                }
              : { present: false as const }
          }
        }
      : {})
  };
  placeableObject.placeableProperties = {
    ...placeableObject.placeableProperties!,
    ...(options.provenDurabilitySaveBytes ?? {}),
    ...(options.provenHitPointState
      ? { hitPoints: options.provenHitPointState.hitPoints }
      : {}),
    ...(options.draftAppearanceType !== undefined
      ? { appearanceType: options.draftAppearanceType }
      : {}),
    ...(options.localizedNameTarget !== undefined
      ? { localizedName: options.localizedNameTarget }
      : {})
  };
  const onChange = vi.fn();
  render(
    <PlaceablePropertiesDialog
      placeablePropertiesDialog={{
        objectId: placeableObject.id,
        snapshotObject: placeableObject,
        draft: buildPlaceablePropertiesDraft(placeableObject),
        activeTab: "basic",
        windowX: 20,
        windowY: 20,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false
      }}
      placeableAppearanceCatalog={options.appearanceCatalog ?? null}
      placeableAppearanceCatalogStatus={
        options.appearanceCatalogStatus ?? (options.appearanceCatalog ? "ready" : "unavailable")
      }
      onPlaceableAppearanceSearch={options.onAppearanceSearch}
      togglePlaceablePropertiesDialogCollapsed={vi.fn()}
      cancelPlaceablePropertiesDialog={vi.fn()}
      setPlaceablePropertiesActiveTab={vi.fn()}
      updatePlaceablePropertiesDraftField={onChange}
      updatePlaceableScriptSlotDraftField={vi.fn()}
      updatePlaceableDisabledFlagDraftField={vi.fn()}
      updatePlaceableLockDraftField={vi.fn()}
      updatePlaceableTrapDraftField={vi.fn()}
      updatePlaceableAdvancedDraftField={vi.fn()}
      addPlaceableInventoryItem={vi.fn()}
      updatePlaceableInventoryItem={vi.fn()}
      movePlaceableInventoryItem={vi.fn()}
      removePlaceableInventoryItem={vi.fn()}
      applyPlaceablePropertiesDraft={vi.fn()}
    />
  );
  return onChange;
}

function renderTrapDialog(options: {
  provenTrapScripts?: { onDisarmScript?: string; onTrapTriggeredScript?: string };
  provenTrapType?: {
    expectedValue: number;
    tableSha256: string;
    tableRowCount: number;
  };
  trapTypeCatalog?: {
    descriptor: {
      resourceName: "traps.2da";
      sourceObjectKey: string;
      sourceLayer: "module" | "hak" | "vanilla";
      sha256: string;
      sizeBytes: number;
      rowCount: number;
    };
    rows: Array<{
      rowIndex: number;
      setDc: number;
      detectDcMod: number;
      disarmDcMod: number;
      displayName: string;
      displaySource: "strref" | "label" | "row_index";
    }>;
  };
  provenTrapSettings?: Partial<{
    isTrapped: boolean;
    detectable: boolean;
    disarmable: boolean;
    oneShot: boolean;
    detectionDc: number;
    disarmDc: number;
  }>;
  sourceType?: "seed" | "aurora_git" | "aurora_blueprint";
  sourceKind?: "placeable" | "creature";
} = {}) {
  const placeableObject = createNewSceneObject("placeables", 1, 2, 3);
  placeableObject.source = {
    type: options.sourceType ?? "aurora_git",
    sourceKind: options.sourceKind ?? "placeable",
    sourceObjectId: "obj_plc_probe",
    ...(options.provenTrapScripts
      ? { placeableTrapScriptResRefs: options.provenTrapScripts }
      : {}),
    ...(options.provenTrapType ? { placeableTrapType: options.provenTrapType } : {}),
    ...(options.provenTrapSettings
      ? { placeableTrapSettings: options.provenTrapSettings }
      : {})
  };
  placeableObject.placeableProperties = {
    plot: false,
    useable: true,
    hasInventory: false,
    trapSettings: {
      isTrapped: true,
      trapType: "Spike Trap, Minor",
      ...(options.provenTrapType ? { trapTypeRow: options.provenTrapType.expectedValue } : {}),
      detectionDc: 10,
      disarmDc: 15,
      oneShot: true,
      detectable: true,
      disarmable: true,
      onDisarmScript: options.provenTrapScripts?.onDisarmScript ?? "",
      onTrapTriggeredScript: options.provenTrapScripts?.onTrapTriggeredScript ?? "",
      setDc: 5,
      detectDcModWhenSetByRogue: 10,
      disarmDcModWhenSetByRogue: 22,
      ...options.provenTrapSettings
    }
  };
  const onChange = vi.fn();
  render(
    <PlaceablePropertiesDialog
      placeablePropertiesDialog={{
        objectId: placeableObject.id,
        snapshotObject: placeableObject,
        draft: buildPlaceablePropertiesDraft(placeableObject),
        activeTab: "trap",
        windowX: 20,
        windowY: 20,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false
      }}
      placeableTrapTypeCatalog={options.trapTypeCatalog ?? null}
      togglePlaceablePropertiesDialogCollapsed={vi.fn()}
      cancelPlaceablePropertiesDialog={vi.fn()}
      setPlaceablePropertiesActiveTab={vi.fn()}
      updatePlaceablePropertiesDraftField={vi.fn()}
      updatePlaceableScriptSlotDraftField={vi.fn()}
      updatePlaceableDisabledFlagDraftField={vi.fn()}
      updatePlaceableLockDraftField={vi.fn()}
      updatePlaceableTrapDraftField={onChange}
      updatePlaceableAdvancedDraftField={vi.fn()}
      addPlaceableInventoryItem={vi.fn()}
      updatePlaceableInventoryItem={vi.fn()}
      movePlaceableInventoryItem={vi.fn()}
      removePlaceableInventoryItem={vi.fn()}
      applyPlaceablePropertiesDraft={vi.fn()}
    />
  );
  return onChange;
}

function renderAdvancedDialog(options: {
  provenTemplateResRef?: string;
  provenConversation?: string;
  provenInterruptable?: number;
  provenAnimationState?: number;
  provenBodyBag?: { expectedValue: number; tableSha256: string; tableRowCount: number };
  provenPortrait?: { expectedValue: number; tableSha256: string; tableRowCount: number };
  provenFaction?: {
    expectedValue: number;
    catalogSha256: string;
    catalogFactionCount: number;
  };
  provenVariables?: Array<
    | { sourceIndex: number; name: string; type: "int"; value: number }
    | { sourceIndex: number; name: string; type: "float"; value: number }
    | { sourceIndex: number; name: string; type: "string"; value: string }
  >;
  variableHandlers?: {
    add: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    move: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  bodyBagCatalog?: {
    descriptor: {
      resourceName: "bodybag.2da";
      sourceObjectKey: string;
      sourceLayer: "module" | "hak" | "vanilla";
      sha256: string;
      sizeBytes: number;
      rowCount: number;
    };
    rows: Array<{
      rowIndex: number;
      label?: string;
      nameStrRef: number;
      displayName: string;
      displaySource: "strref" | "label" | "row_index";
    }>;
  };
  portraitCatalog?: {
    descriptor: {
      resourceName: "portraits.2da";
      sourceObjectKey: string;
      sourceLayer: "module" | "hak" | "vanilla";
      sha256: string;
      sizeBytes: number;
      rowCount: number;
    };
    rows: Array<{ rowIndex: number; baseResRef: string }>;
  };
  factionCatalog?: {
    descriptor: {
      resourceName: "repute.fac";
      sourceObjectKey: string;
      sha256: string;
      sizeBytes: number;
      factionCount: number;
    };
    rows: Array<{
      factionId: number;
      name: string;
      parentFactionId: number;
      isGlobal: boolean;
    }>;
  };
  sourceType?: "seed" | "aurora_git" | "aurora_blueprint";
  sourceKind?: "placeable" | "creature";
} = {}) {
  const placeableObject = createNewSceneObject("placeables", 1, 2, 3);
  placeableObject.source = {
    type: options.sourceType ?? "aurora_git",
    sourceKind: options.sourceKind ?? "placeable",
    sourceObjectId: "obj_plc_advanced_probe",
    ...(options.provenConversation !== undefined
      ? { placeableConversation: options.provenConversation }
      : {}),
    ...(options.provenTemplateResRef !== undefined
      ? { placeableTemplateResRef: options.provenTemplateResRef }
      : {}),
    ...(options.provenInterruptable !== undefined
      ? { placeableInterruptable: options.provenInterruptable }
      : {}),
    ...(options.provenAnimationState !== undefined
      ? { placeableAnimationState: options.provenAnimationState }
      : {}),
    ...(options.provenBodyBag ? { placeableBodyBag: options.provenBodyBag } : {}),
    ...(options.provenPortrait ? { placeablePortrait: options.provenPortrait } : {}),
    ...(options.provenFaction ? { placeableFaction: options.provenFaction } : {}),
    ...(options.provenVariables
      ? { placeableVariables: { expectedEntries: options.provenVariables } }
      : {})
  };
  placeableObject.placeableProperties = {
    ...placeableObject.placeableProperties!,
    ...(options.provenVariables
      ? {
          variables: options.provenVariables.map(({ sourceIndex: _, ...entry }) => entry),
        }
      : {}),
    advancedSettings: {
      blueprintResRef: options.provenTemplateResRef ?? placeableObject.resRef,
      belongsToFaction: "Hostile",
      ...(options.provenFaction ? { factionId: options.provenFaction.expectedValue } : {}),
      conversation: options.provenConversation ?? "preserve_conv",
      noInterrupt:
        options.provenInterruptable === 0
          ? true
          : options.provenInterruptable === 1
            ? false
            : true,
      portraitResRef: "po_preserve",
      ...(options.provenPortrait
        ? { portraitId: options.provenPortrait.expectedValue, portraitResRef: "po_hu_m_01_" }
        : {}),
      initialState:
        options.provenAnimationState === 0
          ? "Closed"
          : options.provenAnimationState === 1
            ? "Opened 1"
            : options.provenAnimationState === 2
              ? "Opened 2"
              : "Closed",
      treasureModel: "Default",
      ...(options.provenBodyBag
        ? { treasureModelRow: options.provenBodyBag.expectedValue }
        : {})
    }
  };
  const onChange = vi.fn();
  render(
    <PlaceablePropertiesDialog
      placeablePropertiesDialog={{
        objectId: placeableObject.id,
        snapshotObject: placeableObject,
        draft: buildPlaceablePropertiesDraft(placeableObject),
        activeTab: "advanced",
        windowX: 20,
        windowY: 20,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false
      }}
      togglePlaceablePropertiesDialogCollapsed={vi.fn()}
      cancelPlaceablePropertiesDialog={vi.fn()}
      setPlaceablePropertiesActiveTab={vi.fn()}
      updatePlaceablePropertiesDraftField={vi.fn()}
      updatePlaceableScriptSlotDraftField={vi.fn()}
      updatePlaceableDisabledFlagDraftField={vi.fn()}
      updatePlaceableLockDraftField={vi.fn()}
      updatePlaceableTrapDraftField={vi.fn()}
      updatePlaceableAdvancedDraftField={onChange}
      placeableBodyBagCatalog={options.bodyBagCatalog ?? null}
      placeablePortraitCatalog={options.portraitCatalog ?? null}
      placeableFactionCatalog={options.factionCatalog ?? null}
      addPlaceableInventoryItem={vi.fn()}
      updatePlaceableInventoryItem={vi.fn()}
      movePlaceableInventoryItem={vi.fn()}
      removePlaceableInventoryItem={vi.fn()}
      addPlaceableVariable={options.variableHandlers?.add}
      updatePlaceableVariable={options.variableHandlers?.update}
      movePlaceableVariable={options.variableHandlers?.move}
      removePlaceableVariable={options.variableHandlers?.remove}
      applyPlaceablePropertiesDraft={vi.fn()}
    />
  );
  return onChange;
}

function renderLongTextDialog(options: {
  tab: "description" | "comments";
  provenEditorComment?: string;
  provenLocalizedStrings?: SceneObjectPlaceableLocalizedStrings;
  sourceIndex?: number;
  sourceType?: "seed" | "aurora_git" | "aurora_blueprint";
  sourceKind?: "placeable" | "creature";
}) {
  const placeableObject = createNewSceneObject("placeables", 1, 2, 3);
  placeableObject.source = {
    type: options.sourceType ?? "aurora_git",
    sourceKind: options.sourceKind ?? "placeable",
    sourceObjectId: "obj_plc_comment_probe",
    ...(options.sourceIndex !== undefined ? { sourceIndex: options.sourceIndex } : {}),
    ...(options.provenLocalizedStrings
      ? { placeableLocalizedStrings: options.provenLocalizedStrings }
      : {}),
    ...(options.provenEditorComment !== undefined
      ? { placeableEditorComment: options.provenEditorComment }
      : {})
  };
  placeableObject.placeableProperties = {
    ...placeableObject.placeableProperties!,
    description: "Localized gameplay description",
    comments: options.provenEditorComment ?? "preserve editor comment"
  };
  const onChange = vi.fn();
  render(
    <PlaceablePropertiesDialog
      placeablePropertiesDialog={{
        objectId: placeableObject.id,
        snapshotObject: placeableObject,
        draft: buildPlaceablePropertiesDraft(placeableObject),
        activeTab: options.tab,
        windowX: 20,
        windowY: 20,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false
      }}
      togglePlaceablePropertiesDialogCollapsed={vi.fn()}
      cancelPlaceablePropertiesDialog={vi.fn()}
      setPlaceablePropertiesActiveTab={vi.fn()}
      updatePlaceablePropertiesDraftField={onChange}
      updatePlaceableScriptSlotDraftField={vi.fn()}
      updatePlaceableDisabledFlagDraftField={vi.fn()}
      updatePlaceableLockDraftField={vi.fn()}
      updatePlaceableTrapDraftField={vi.fn()}
      updatePlaceableAdvancedDraftField={vi.fn()}
      addPlaceableInventoryItem={vi.fn()}
      updatePlaceableInventoryItem={vi.fn()}
      movePlaceableInventoryItem={vi.fn()}
      removePlaceableInventoryItem={vi.fn()}
      applyPlaceablePropertiesDraft={vi.fn()}
    />
  );
  return onChange;
}

function renderLockDialog(options: {
  provenLockSettings?: Partial<{
    locked: boolean;
    canRelock: boolean;
    autoRemoveKeyAfterUse: boolean;
    keyRequiredToUnlockOrLock: boolean;
    openLockDc: number;
    closeLockDc: number;
    keyTag: string;
  }>;
  sourceType?: "seed" | "aurora_git" | "aurora_blueprint";
  sourceKind?: "placeable" | "creature";
} = {}) {
  const placeableObject = createNewSceneObject("placeables", 1, 2, 3);
  placeableObject.source = {
    type: options.sourceType ?? "aurora_git",
    sourceKind: options.sourceKind ?? "placeable",
    sourceObjectId: "obj_plc_probe",
    ...(options.provenLockSettings
      ? { placeableLockSettings: options.provenLockSettings }
      : {})
  };
  placeableObject.placeableProperties = {
    plot: false,
    useable: true,
    hasInventory: false,
    lockSettings: {
      locked: options.provenLockSettings?.locked ?? true,
      canRelock: options.provenLockSettings?.canRelock ?? true,
      autoRemoveKeyAfterUse: options.provenLockSettings?.autoRemoveKeyAfterUse ?? false,
      keyRequiredToUnlockOrLock:
        options.provenLockSettings?.keyRequiredToUnlockOrLock ?? false,
      openLockDc: options.provenLockSettings?.openLockDc ?? 18,
      closeLockDc: options.provenLockSettings?.closeLockDc ?? 0,
      keyTag: options.provenLockSettings?.keyTag ?? "preserve_only"
    }
  };
  const onChange = vi.fn();
  render(
    <PlaceablePropertiesDialog
      placeablePropertiesDialog={{
        objectId: placeableObject.id,
        snapshotObject: placeableObject,
        draft: buildPlaceablePropertiesDraft(placeableObject),
        activeTab: "lock",
        windowX: 20,
        windowY: 20,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false
      }}
      togglePlaceablePropertiesDialogCollapsed={vi.fn()}
      cancelPlaceablePropertiesDialog={vi.fn()}
      setPlaceablePropertiesActiveTab={vi.fn()}
      updatePlaceablePropertiesDraftField={vi.fn()}
      updatePlaceableScriptSlotDraftField={vi.fn()}
      updatePlaceableDisabledFlagDraftField={vi.fn()}
      updatePlaceableLockDraftField={onChange}
      updatePlaceableTrapDraftField={vi.fn()}
      updatePlaceableAdvancedDraftField={vi.fn()}
      addPlaceableInventoryItem={vi.fn()}
      updatePlaceableInventoryItem={vi.fn()}
      movePlaceableInventoryItem={vi.fn()}
      removePlaceableInventoryItem={vi.fn()}
      applyPlaceablePropertiesDraft={vi.fn()}
    />
  );
  return onChange;
}

describe("PlaceablePropertiesDialog", () => {
  it("edits only coordinates and order for exact GIT ItemList entries", () => {
    const handlers = renderInventoryDialog();

    fireEvent.click(screen.getByRole("button", { name: /add admitted uti: nw_cloth022/i }));
    expect(handlers.addPlaceableInventoryItem).toHaveBeenCalledTimes(1);

    expect(screen.getByText("s03proofamuletr2")).toBeInTheDocument();
    expect(screen.getByText("Existing native #0")).toBeInTheDocument();
    expect(screen.getByText("Admitted UTI nw_cloth022")).toBeInTheDocument();
    expect(screen.queryByLabelText(/resref/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/random/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/dropable|pickpocketable|infinite/i)).not.toBeInTheDocument();
    const firstX = screen.getByLabelText(/placeable inventory item 1 repo x/i);
    const firstY = screen.getByLabelText(/placeable inventory item 1 repo y/i);
    expect(firstX).toBeEnabled();
    expect(firstY).toBeEnabled();
    expect(firstX).toHaveValue(3);
    expect(firstY).toHaveValue(4);
    fireEvent.change(firstX, {
      target: { value: "7" }
    });
    fireEvent.change(firstY, {
      target: { value: "9" }
    });
    const firstUp = screen.getByRole("button", { name: /move item 1 up/i });
    const firstDown = screen.getByRole("button", { name: /move item 1 down/i });
    const secondUp = screen.getByRole("button", { name: /move item 2 up/i });
    const secondDown = screen.getByRole("button", { name: /move item 2 down/i });
    expect(firstUp).toBeDisabled();
    expect(firstDown).toBeEnabled();
    expect(secondUp).toBeEnabled();
    expect(secondDown).toBeDisabled();
    fireEvent.click(firstDown);
    fireEvent.click(secondUp);
    fireEvent.click(screen.getAllByRole("button", { name: /^remove$/i })[0]!);

    expect(handlers.updatePlaceableInventoryItem).toHaveBeenCalledWith(0, "x", 7);
    expect(handlers.updatePlaceableInventoryItem).toHaveBeenCalledWith(0, "y", 9);
    expect(handlers.movePlaceableInventoryItem).toHaveBeenCalledWith(0, "down");
    expect(handlers.movePlaceableInventoryItem).toHaveBeenCalledWith(1, "up");
    expect(handlers.removePlaceableInventoryItem).toHaveBeenCalledWith(0);
  });

  it("keeps ItemList preserve-only without exact existing provenance", () => {
    const handlers = renderInventoryDialog({ provenInventory: false });

    expect(screen.getByRole("button", { name: /add admitted uti: nw_cloth022/i })).toBeDisabled();
    expect(screen.getByLabelText(/placeable inventory item 1 repo x/i)).toBeDisabled();
    expect(screen.getAllByRole("button", { name: /^remove$/i })[0]).toBeDisabled();
    expect(handlers.addPlaceableInventoryItem).not.toHaveBeenCalled();
  });

  it("renders an exact empty ItemList without coupling it to Has Inventory", () => {
    renderInventoryDialog({ emptyInventory: true });

    expect(screen.getByText("No inventory entries")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add admitted uti: nw_cloth022/i })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^remove$/i })).not.toBeInTheDocument();
  });

  it("enables only OnUsed when exact existing-instance provenance is present", () => {
    const onChange = renderScriptsDialog({ provenOnUsed: true });
    const onUsed = screen.getByLabelText("OnUsed Script");
    const onOpen = screen.getByLabelText("OnOpen Script");

    expect(onUsed).toBeEnabled();
    expect(onOpen).toBeDisabled();
    fireEvent.change(onUsed, { target: { value: "s04_plcprobe" } });
    expect(onChange).toHaveBeenCalledWith("onUsed", "s04_plcprobe");
  });

  it("keeps OnUsed preserve-only when exact instance provenance is absent", () => {
    renderScriptsDialog({ provenOnUsed: false });
    expect(screen.getByLabelText("OnUsed Script")).toBeDisabled();
  });

  it("enables exactly the provenance-bound placeable script slots", () => {
    const onChange = renderScriptsDialog({
      provenOnUsed: false,
      provenScripts: { onClick: "", onOpen: "old_open" }
    });
    const onClick = screen.getByLabelText("OnClick Script");
    const onOpen = screen.getByLabelText("OnOpen Script");

    expect(onClick).toBeEnabled();
    expect(onOpen).toBeEnabled();
    expect(screen.getByLabelText("OnLock Script")).toBeDisabled();
    expect(screen.getByLabelText("OnUsed Script")).toBeDisabled();
    fireEvent.change(onClick, { target: { value: "new_click" } });
    fireEvent.change(onOpen, { target: { value: "new_open" } });
    expect(onChange).toHaveBeenCalledWith("onClick", "new_click");
    expect(onChange).toHaveBeenCalledWith("onOpen", "new_open");
  });

  it.each([
    ["non-GIT source", { provenOnUsed: true, sourceType: "seed" as const }],
    ["non-placeable source kind", { provenOnUsed: true, sourceKind: "creature" as const }]
  ])("keeps OnUsed disabled for %s", (_label, options) => {
    renderScriptsDialog(options);
    expect(screen.getByLabelText("OnUsed Script")).toBeDisabled();
  });

  it("enables every provenance-bound Placeable boolean flag", () => {
    const onChange = renderBasicDialog({
      provenStatic: true,
      provenUseable: true,
      provenPlot: true,
      provenHasInventory: true
    });
    const staticFlag = screen.getByRole("checkbox", { name: /Static/ });
    const useableFlag = screen.getByRole("checkbox", { name: /Useable/ });
    const plotFlag = screen.getByRole("checkbox", { name: /Plot/ });
    const inventoryFlag = screen.getByRole("checkbox", { name: /Has Inventory/ });

    expect(staticFlag).toBeEnabled();
    expect(useableFlag).toBeEnabled();
    expect(plotFlag).toBeEnabled();
    expect(inventoryFlag).toBeEnabled();

    fireEvent.click(staticFlag);
    fireEvent.click(useableFlag);
    fireEvent.click(plotFlag);
    fireEvent.click(inventoryFlag);
    expect(onChange).toHaveBeenCalledWith("isStatic", false);
    expect(onChange).toHaveBeenCalledWith("useable", true);
    expect(onChange).toHaveBeenCalledWith("plot", true);
    expect(onChange).toHaveBeenCalledWith("hasInventory", true);
  });

  it.each([
    ["absent provenance", {}],
    ["non-GIT source", { provenStatic: true, provenUseable: true, sourceType: "seed" as const }],
    ["non-placeable source", { provenStatic: true, provenUseable: true, sourceKind: "creature" as const }]
  ])("keeps Static and Useable preserve-only for %s", (_label, options) => {
    renderBasicDialog(options);
    expect(screen.getByRole("checkbox", { name: /Static/ })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /Useable/ })).toBeDisabled();
  });

  it("keeps Plot and Has Inventory preserve-only without their exact provenance", () => {
    renderBasicDialog({ provenStatic: true, provenUseable: true });
    expect(screen.getByRole("checkbox", { name: /Plot/ })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /Has Inventory/ })).toBeDisabled();
  });

  it("keeps retained GIT Name, Tag, Template ResRef, and Appearance Type preserve-only", () => {
    const onChange = renderBasicDialog({ sourceAppearanceType: 104 });
    const name = screen.getByRole("textbox", { name: "Name" });
    const tag = screen.getByRole("textbox", { name: "Tag" });
    const templateResRef = screen.getByRole("textbox", { name: "Template ResRef" });
    const appearanceType = screen.getByRole("textbox", { name: "Appearance Type" });

    expect(name).toBeDisabled();
    expect(tag).toBeDisabled();
    expect(templateResRef).toBeDisabled();
    expect(appearanceType).toBeDisabled();
    expect(appearanceType).toHaveAttribute("readonly");
    expect(appearanceType).toHaveValue("104");
    for (const input of [name, tag, templateResRef, appearanceType]) {
      expect(input.parentElement).toHaveTextContent("PRESERVE_ONLY");
    }

    fireEvent.change(name, { target: { value: "Changed Name" } });
    fireEvent.change(tag, { target: { value: "ChangedTag" } });
    fireEvent.change(templateResRef, { target: { value: "plc_other" } });
    fireEvent.change(appearanceType, { target: { value: "105" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("enables only an exact ordinal-bound retained Placeable Tag and preserves its text verbatim", () => {
    const onChange = renderBasicDialog({ sourceIndex: 0, sourceTag: "WaterTrough" });
    const name = screen.getByRole("textbox", { name: "Name" });
    const tag = screen.getByRole("textbox", { name: "Tag" });
    const templateResRef = screen.getByRole("textbox", { name: "Template ResRef" });

    expect(name).toBeDisabled();
    expect(tag).toBeEnabled();
    expect(tag).toHaveAttribute("maxlength", "32");
    expect(tag.parentElement).toHaveTextContent("ACTIVE_NOW");
    expect(templateResRef).toBeDisabled();

    fireEvent.change(tag, { target: { value: " New Tag " } });
    expect(onChange).toHaveBeenCalledWith("tag", " New Tag ");
  });

  it("enables only an exact ordinal-bound inline-ASCII LocName with its 256-byte budget", () => {
    const onChange = renderBasicDialog({
      sourceIndex: 0,
      localizedNameTarget: "Chest",
      provenLocalizedStrings: {
        locName: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "Q2hlc3Q=" }]
        },
        description: { present: false }
      }
    });
    const name = screen.getByRole("textbox", { name: "Name" });
    expect(name).toBeEnabled();
    expect(name).toHaveValue("Chest");
    expect(name).toHaveAttribute("maxLength", "256");
    expect(name.parentElement).toHaveTextContent("ACTIVE_NOW");
    fireEvent.change(name, { target: { value: " Chest 2 " } });
    expect(onChange).toHaveBeenCalledWith("name", " Chest 2 ");
  });

  it("edits only a physical Appearance row admitted by the exact digest-bound catalog", () => {
    const onAppearanceSearch = vi.fn();
    const onChange = renderBasicDialog({
      sourceAppearanceType: 104,
      sourceAppearanceTable: true,
      appearanceCatalog: {
        tableSha256: "a".repeat(64),
        rowCount: 400,
        query: "",
        items: [
          { rowIndex: 104, displayName: "Water Trough", displaySource: "label" },
          { rowIndex: 105, displayName: "Stone Chest", displaySource: "strref" }
        ]
      },
      onAppearanceSearch
    });

    const appearanceType = screen.getByRole("combobox", { name: "Appearance Type" });
    expect(appearanceType).toBeEnabled();
    expect(appearanceType).toHaveValue("104");
    expect(appearanceType.parentElement).toHaveTextContent("ACTIVE_NOW");
    fireEvent.change(appearanceType, { target: { value: "105" } });
    expect(onChange).toHaveBeenCalledWith("appearanceType", 105);

    fireEvent.change(screen.getByRole("searchbox", { name: "Appearance Search" }), {
      target: { value: "stone" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Search Appearance rows" }));
    expect(onAppearanceSearch).toHaveBeenCalledWith("stone");
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Tag" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Template ResRef" })).toBeDisabled();
  });

  it("keeps the selected non-source Appearance option controlled", () => {
    renderBasicDialog({
      sourceAppearanceType: 104,
      sourceAppearanceTable: true,
      draftAppearanceType: 105,
      appearanceCatalog: {
        tableSha256: "a".repeat(64),
        rowCount: 400,
        query: "",
        items: [
          { rowIndex: 104, displayName: "Water Trough", displaySource: "label" },
          { rowIndex: 105, displayName: "Stone Chest", displaySource: "strref" }
        ]
      }
    });
    expect(screen.getByRole("combobox", { name: "Appearance Type" })).toHaveValue("105");
  });

  it("keeps exact Appearance provenance preserve-only when the loaded catalog digest differs", () => {
    renderBasicDialog({
      sourceAppearanceType: 104,
      sourceAppearanceTable: true,
      appearanceCatalog: {
        tableSha256: "b".repeat(64),
        rowCount: 400,
        query: "",
        items: [{ rowIndex: 104, displayName: "Wrong table", displaySource: "row_index" }]
      }
    });
    const appearanceType = screen.getByRole("textbox", { name: "Appearance Type" });
    expect(appearanceType).toBeDisabled();
    expect(appearanceType.parentElement).toHaveTextContent("PRESERVE_ONLY");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps exact Appearance preserve-only while loading and disables search without a callback", () => {
    renderBasicDialog({
      sourceAppearanceType: 104,
      sourceAppearanceTable: true,
      appearanceCatalogStatus: "loading"
    });
    expect(screen.getByRole("textbox", { name: "Appearance Type" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Loading Appearance rows");

    renderBasicDialog({
      sourceAppearanceType: 104,
      sourceAppearanceTable: true,
      appearanceCatalog: {
        tableSha256: "a".repeat(64),
        rowCount: 400,
        query: "",
        items: [{ rowIndex: 104, displayName: "Water Trough", displaySource: "label" }]
      }
    });
    expect(screen.getAllByRole("button", { name: "Search Appearance rows" }).at(-1)).toBeDisabled();
  });

  it("does not show Appearance loading state without admitted provenance", () => {
    renderBasicDialog({ appearanceCatalogStatus: "loading" });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not enable an exact catalog until its load status is ready", () => {
    renderBasicDialog({
      sourceAppearanceType: 104,
      sourceAppearanceTable: true,
      appearanceCatalogStatus: "loading",
      appearanceCatalog: {
        tableSha256: "a".repeat(64),
        rowCount: 400,
        query: "",
        items: [{ rowIndex: 104, displayName: "Water Trough", displaySource: "label" }]
      }
    });
    expect(screen.getByRole("textbox", { name: "Appearance Type" })).toBeDisabled();
    expect(screen.queryByRole("combobox", { name: "Appearance Type" })).toBeNull();
  });

  it("keeps local Name, Tag, and Template ResRef editing separate from Appearance Type", () => {
    const onChange = renderBasicDialog({ sourceType: "seed" });
    const name = screen.getByRole("textbox", { name: "Name" });
    const tag = screen.getByRole("textbox", { name: "Tag" });
    const templateResRef = screen.getByRole("textbox", { name: "Template ResRef" });
    const appearanceType = screen.getByRole("textbox", { name: "Appearance Type" });

    expect(name).toBeEnabled();
    expect(tag).toBeEnabled();
    expect(templateResRef).toBeEnabled();
    expect(appearanceType).toBeDisabled();
    expect(name.parentElement).not.toHaveTextContent("PRESERVE_ONLY");
    expect(tag.parentElement).not.toHaveTextContent("PRESERVE_ONLY");
    expect(templateResRef.parentElement).not.toHaveTextContent("PRESERVE_ONLY");
    expect(appearanceType.parentElement).toHaveTextContent("PRESERVE_ONLY");

    fireEvent.change(name, { target: { value: "Local Name" } });
    fireEvent.change(tag, { target: { value: "LocalTag" } });
    fireEvent.change(templateResRef, { target: { value: "plc_local_other" } });
    expect(onChange).toHaveBeenCalledWith("name", "Local Name");
    expect(onChange).toHaveBeenCalledWith("tag", "LocalTag");
    expect(onChange).toHaveBeenCalledWith("resRef", "plc_local_other");
  });

  it.each([
    [0, "0"],
    [0xffff_ffff, "4294967295"]
  ])("presents DWord Appearance boundary %s as read-only provenance", (value, label) => {
    renderBasicDialog({ sourceAppearanceType: value });
    expect(screen.getByRole("textbox", { name: "Appearance Type" })).toHaveValue(label);
  });

  it.each([-1, 104.5, 0x1_0000_0000])(
    "does not present invalid non-DWord Appearance provenance %s as editable state",
    (sourceAppearanceType) => {
      renderBasicDialog({ sourceAppearanceType });
      expect(screen.getByRole("textbox", { name: "Appearance Type" })).toHaveValue("");
      expect(screen.getByRole("textbox", { name: "Appearance Type" })).toBeDisabled();
    }
  );

  it("does not present legacy Byte Appearance as canonical editable provenance", () => {
    renderBasicDialog({ sourceAppearanceType: 104, sourceAppearanceNativeType: "byte" });
    expect(screen.getByRole("textbox", { name: "Appearance Type" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Appearance Type" })).toBeDisabled();
  });

  it("enables exactly the four provenance-bound durability/save Byte fields", () => {
    const onChange = renderBasicDialog({
      provenDurabilitySaveBytes: {
        hardness: 0,
        fortitudeSave: 255,
        reflexSave: 4,
        willSave: 12
      }
    });
    const hardness = screen.getByLabelText("Hardness");
    const hitPoints = screen.getByLabelText("Hit Points");
    const fortitude = screen.getByLabelText("Fortitude Save");
    const reflex = screen.getByLabelText("Reflex Save");
    const will = screen.getByLabelText("Will Save");

    for (const input of [hardness, fortitude, reflex, will]) {
      expect(input).toBeEnabled();
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAttribute("max", "255");
      expect(input).toHaveAttribute("step", "1");
    }
    expect(hardness).toHaveValue(0);
    expect(fortitude).toHaveValue(255);
    expect(reflex).toHaveValue(4);
    expect(will).toHaveValue(12);
    expect(hitPoints).toBeDisabled();
    fireEvent.change(hardness, { target: { value: "9" } });
    fireEvent.change(fortitude, { target: { value: "18" } });
    fireEvent.change(reflex, { target: { value: "7" } });
    fireEvent.change(will, { target: { value: "17" } });
    expect(onChange).toHaveBeenCalledWith("hardness", 9);
    expect(onChange).toHaveBeenCalledWith("fortitudeSave", 18);
    expect(onChange).toHaveBeenCalledWith("reflexSave", 7);
    expect(onChange).toHaveBeenCalledWith("willSave", 17);
  });

  it("keeps absent durability/save Bytes and Hit Points preserve-only independently", () => {
    renderBasicDialog({ provenDurabilitySaveBytes: { hardness: 9 } });

    expect(screen.getByLabelText("Hardness")).toBeEnabled();
    expect(screen.getByLabelText("Hardness")).toHaveValue(9);
    expect(screen.getByLabelText("Fortitude Save")).toBeDisabled();
    expect(screen.getByLabelText("Reflex Save")).toBeDisabled();
    expect(screen.getByLabelText("Will Save")).toBeDisabled();
    expect(screen.getByLabelText("Hit Points")).toBeDisabled();
    expect(
      screen.getAllByText("PRESERVE_ONLY", { selector: ".canvas-accessibility-hidden" }).length
    ).toBeGreaterThan(0);
  });

  it("enables exact provenance-bound HP in the Toolset range independently of durability Bytes", () => {
    const onChange = renderBasicDialog({
      provenHitPointState: { hitPoints: 15, currentHitPoints: 45 }
    });
    const hitPoints = screen.getByLabelText("Hit Points");

    expect(hitPoints).toBeEnabled();
    expect(hitPoints).toHaveValue(15);
    expect(hitPoints).toHaveAttribute("min", "1");
    expect(hitPoints).toHaveAttribute("max", "10000");
    expect(hitPoints).toHaveAttribute("step", "1");
    expect(hitPoints.parentElement).toHaveTextContent("ACTIVE_NOW");
    expect(screen.getByLabelText("Hardness")).toBeDisabled();

    fireEvent.change(hitPoints, { target: { value: "30" } });
    expect(onChange).toHaveBeenCalledWith("hitPoints", 30);
  });

  it.each([
    ["non-GIT source", { sourceType: "seed" as const }],
    ["non-Placeable source", { sourceKind: "creature" as const }]
  ])("keeps HP preserve-only for %s", (_label, family) => {
    renderBasicDialog({
      ...family,
      provenHitPointState: { hitPoints: 15, currentHitPoints: 45 }
    });
    expect(screen.getByLabelText("Hit Points")).toBeDisabled();
  });

  it.each([
    ["non-GIT source", { sourceType: "seed" as const }],
    ["non-Placeable source", { sourceKind: "creature" as const }]
  ])("keeps every durability/save Byte preserve-only for %s", (_label, family) => {
    renderBasicDialog({
      ...family,
      provenDurabilitySaveBytes: {
        hardness: 5,
        fortitudeSave: 16,
        reflexSave: 0,
        willSave: 0
      }
    });

    expect(screen.getByLabelText("Hardness")).toBeDisabled();
    expect(screen.getByLabelText("Fortitude Save")).toBeDisabled();
    expect(screen.getByLabelText("Reflex Save")).toBeDisabled();
    expect(screen.getByLabelText("Will Save")).toBeDisabled();
  });

  it("enables exactly the seven provenance-bound lock fields including KeyName", () => {
    const onChange = renderLockDialog({
      provenLockSettings: {
        locked: true,
        canRelock: true,
        autoRemoveKeyAfterUse: false,
        keyRequiredToUnlockOrLock: false,
        openLockDc: 18,
        closeLockDc: 0,
        keyTag: ""
      }
    });
    const locked = screen.getByRole("checkbox", { name: "Locked" });
    const relock = screen.getByRole("checkbox", { name: "Can be relocked" });
    const autoRemove = screen.getByRole("checkbox", {
      name: "Automatically remove key after use"
    });
    const keyRequired = screen.getByRole("checkbox", {
      name: "Key required to unlock or lock"
    });
    const openDc = screen.getByLabelText("Open Lock DC");
    const closeDc = screen.getByLabelText("Close Lock DC");

    for (const control of [locked, relock, autoRemove, keyRequired, openDc, closeDc]) {
      expect(control).toBeEnabled();
    }
    const keyTag = screen.getByLabelText("Key Tag");
    expect(keyTag).toBeEnabled();
    expect(keyTag).toHaveAttribute("maxLength", "32");
    fireEvent.click(locked);
    fireEvent.change(openDc, { target: { value: "24" } });
    fireEvent.change(keyTag, { target: { value: "CHEST_KEY_01" } });
    expect(onChange).toHaveBeenCalledWith("locked", false);
    expect(onChange).toHaveBeenCalledWith("openLockDc", 24);
    expect(onChange).toHaveBeenCalledWith("keyTag", "CHEST_KEY_01");
  });

  it("keeps absent Placeable lock fields preserve-only independently", () => {
    renderLockDialog({ provenLockSettings: { locked: true } });
    expect(screen.getByRole("checkbox", { name: "Locked" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Can be relocked" })).toBeDisabled();
    expect(screen.getByLabelText("Open Lock DC")).toBeDisabled();
    expect(screen.getByLabelText("Key Tag")).toBeDisabled();
  });

  it("enables only exact provenance-bound trap scripts and keeps all other trap fields preserve-only", () => {
    const onChange = renderTrapDialog({
      provenTrapScripts: { onDisarmScript: "", onTrapTriggeredScript: "old_trap" }
    });
    const onDisarm = screen.getByLabelText("OnDisarm");
    const onTriggered = screen.getByLabelText("OnTrapTriggered");

    expect(onDisarm).toBeEnabled();
    expect(onTriggered).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Is Trapped" })).toBeDisabled();
    expect(screen.getByLabelText("Trap Type")).toBeDisabled();
    expect(screen.getByLabelText("Detection DC")).toBeDisabled();
    fireEvent.change(onDisarm, { target: { value: "new_disarm" } });
    fireEvent.change(onTriggered, { target: { value: "new_trap" } });
    expect(onChange).toHaveBeenCalledWith("onDisarmScript", "new_disarm");
    expect(onChange).toHaveBeenCalledWith("onTrapTriggeredScript", "new_trap");
  });

  it.each([
    ["absent provenance", {}],
    ["non-GIT source", { provenTrapScripts: { onDisarmScript: "" }, sourceType: "seed" as const }],
    ["non-placeable source", { provenTrapScripts: { onDisarmScript: "" }, sourceKind: "creature" as const }]
  ])("keeps placeable trap scripts preserve-only for %s", (_label, options) => {
    renderTrapDialog(options);
    expect(screen.getByLabelText("OnDisarm")).toBeDisabled();
    expect(screen.getByLabelText("OnTrapTriggered")).toBeDisabled();
  });

  it("enables exactly the six independently proven trap Byte fields", () => {
    const onChange = renderTrapDialog({
      provenTrapSettings: {
        isTrapped: false,
        detectable: true,
        disarmable: false,
        oneShot: true,
        detectionDc: 0,
        disarmDc: 255
      }
    });

    const isTrapped = screen.getByRole("checkbox", { name: "Is Trapped" });
    const detectable = screen.getByRole("checkbox", { name: "Detectable" });
    const disarmable = screen.getByRole("checkbox", { name: "Disarmable" });
    const oneShot = screen.getByRole("checkbox", { name: "One Shot" });
    const detectionDc = screen.getByLabelText("Detection DC");
    const disarmDc = screen.getByLabelText("Disarm DC");

    for (const control of [isTrapped, detectable, disarmable, oneShot, detectionDc, disarmDc]) {
      expect(control).toBeEnabled();
    }
    expect(screen.getByLabelText("Trap Type")).toBeDisabled();
    expect(screen.getByLabelText("Set DC")).toBeDisabled();
    expect(screen.getByLabelText("Detect DC Mod. when set by Rogue")).toBeDisabled();
    expect(screen.getByLabelText("Disarm DC Mod. when set by Rogue")).toBeDisabled();

    fireEvent.click(isTrapped);
    fireEvent.click(disarmable);
    fireEvent.change(detectionDc, { target: { value: "17" } });
    fireEvent.change(disarmDc, { target: { value: "33" } });
    expect(onChange).toHaveBeenCalledWith("isTrapped", true);
    expect(onChange).toHaveBeenCalledWith("disarmable", true);
    expect(onChange).toHaveBeenCalledWith("detectionDc", 17);
    expect(onChange).toHaveBeenCalledWith("disarmDc", 33);
  });

  it("edits TrapType as the physical traps.2da row and keeps derived columns read-only", () => {
    const tableSha256 = "d".repeat(64);
    const onChange = renderTrapDialog({
      provenTrapType: {
        expectedValue: 1,
        tableSha256,
        tableRowCount: 2
      },
      trapTypeCatalog: {
        descriptor: {
          resourceName: "traps.2da",
          sourceObjectKey: "modules/current/traps.2da",
          sourceLayer: "module",
          sha256: tableSha256,
          sizeBytes: 2048,
          rowCount: 2
        },
        rows: [
          {
            rowIndex: 0,
            setDc: 10,
            detectDcMod: 0,
            disarmDcMod: 3,
            displayName: "Minor",
            displaySource: "label"
          },
          {
            rowIndex: 1,
            setDc: 20,
            detectDcMod: 2,
            disarmDcMod: 6,
            displayName: "Deadly",
            displaySource: "strref"
          }
        ]
      }
    });

    const trapType = screen.getByLabelText("Trap Type");
    expect(trapType).toBeEnabled();
    expect(trapType).toHaveValue("1");
    expect(screen.getByRole("option", { name: "0: Minor" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "1: Deadly" })).toBeInTheDocument();
    expect(screen.getByLabelText("Set DC")).toBeDisabled();
    expect(screen.getByLabelText("Detect DC Mod. when set by Rogue")).toBeDisabled();
    expect(screen.getByLabelText("Disarm DC Mod. when set by Rogue")).toBeDisabled();

    fireEvent.change(trapType, { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith("trapTypeRow", 0);
  });

  it("keeps TrapType preserve-only when its table digest is stale", () => {
    renderTrapDialog({
      provenTrapType: {
        expectedValue: 0,
        tableSha256: "d".repeat(64),
        tableRowCount: 1
      },
      trapTypeCatalog: {
        descriptor: {
          resourceName: "traps.2da",
          sourceObjectKey: "modules/current/traps.2da",
          sourceLayer: "module",
          sha256: "e".repeat(64),
          sizeBytes: 2048,
          rowCount: 1
        },
        rows: [{
          rowIndex: 0,
          setDc: 10,
          detectDcMod: 0,
          disarmDcMod: 3,
          displayName: "Minor",
          displaySource: "label"
        }]
      }
    });

    expect(screen.getByLabelText("Trap Type")).toBeDisabled();
  });

  it("keeps trap Byte field admission presence-sensitive even when Is Trapped is false", () => {
    renderTrapDialog({ provenTrapSettings: { detectionDc: 0 } });

    expect(screen.getByLabelText("Detection DC")).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Is Trapped" })).toBeDisabled();
    expect(screen.getByLabelText("Disarm DC")).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "One Shot" })).toBeDisabled();
  });

  it.each([
    ["invalid provenance", { provenTrapSettings: { isTrapped: 1, detectionDc: 256 } }],
    ["non-GIT source", {
      provenTrapSettings: { isTrapped: false, detectionDc: 0 },
      sourceType: "seed" as const
    }],
    ["non-Placeable source", {
      provenTrapSettings: { isTrapped: false, detectionDc: 0 },
      sourceKind: "creature" as const
    }]
  ])("keeps trap Byte fields preserve-only for %s", (_label, options) => {
    renderTrapDialog(options as Parameters<typeof renderTrapDialog>[0]);

    expect(screen.getByRole("checkbox", { name: "Is Trapped" })).toBeDisabled();
    expect(screen.getByLabelText("Detection DC")).toBeDisabled();
  });

  it("enables exact empty Conversation and inverse native Interruptable zero", () => {
    const onChange = renderAdvancedDialog({
      provenConversation: "",
      provenInterruptable: 0
    });
    const conversation = screen.getByLabelText("Conversation");
    const noInterrupt = screen.getByRole("checkbox", { name: "No Interrupt" });

    expect(conversation).toBeEnabled();
    expect(conversation).toHaveValue("");
    expect(conversation).toHaveAttribute("maxLength", "16");
    expect(noInterrupt).toBeEnabled();
    expect(noInterrupt).toBeChecked();
    expect(screen.getByRole("button", { name: "Browse conversation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit conversation" })).toBeDisabled();

    fireEvent.change(conversation, { target: { value: "new_conv_01" } });
    fireEvent.click(noInterrupt);
    expect(onChange).toHaveBeenCalledWith("conversation", "new_conv_01");
    expect(onChange).toHaveBeenCalledWith("noInterrupt", false);
  });

  it("keeps Conversation and Interruptable presence-sensitive independently", () => {
    renderAdvancedDialog({ provenConversation: "existing_conv" });

    expect(screen.getByLabelText("Conversation")).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "No Interrupt" })).toBeDisabled();
  });

  it.each([
    ["absent provenance", {}],
    ["invalid values", { provenConversation: "bad-conv", provenInterruptable: 2 }],
    ["non-GIT source", {
      provenConversation: "valid_conv",
      provenInterruptable: 1,
      sourceType: "seed" as const
    }],
    ["non-Placeable source", {
      provenConversation: "valid_conv",
      provenInterruptable: 1,
      sourceKind: "creature" as const
    }]
  ])("keeps Conversation and No Interrupt preserve-only for %s", (_label, options) => {
    renderAdvancedDialog(options);

    expect(screen.getByLabelText("Conversation")).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "No Interrupt" })).toBeDisabled();
  });

  it("enables exact AnimationState with only the three frozen Open State tokens", () => {
    const onChange = renderAdvancedDialog({ provenAnimationState: 0 });
    const initialState = screen.getByLabelText("Initial State");

    expect(initialState).toBeEnabled();
    expect(initialState).toHaveValue("Closed");
    expect(Array.from(initialState.querySelectorAll("option"), (option) => option.textContent))
      .toEqual(["Closed", "Opened 1", "Opened 2"]);
    fireEvent.change(initialState, { target: { value: "Opened 2" } });
    expect(onChange).toHaveBeenCalledWith("initialState", "Opened 2");
  });

  it.each([
    ["absent provenance", {}],
    ["invalid provenance", { provenAnimationState: 3 }],
    ["non-GIT source", { provenAnimationState: 0, sourceType: "seed" as const }],
    ["non-Placeable source", {
      provenAnimationState: 0,
      sourceKind: "creature" as const
    }]
  ])("keeps Initial State preserve-only for %s", (_label, options) => {
    renderAdvancedDialog(options);
    expect(screen.getByLabelText("Initial State")).toBeDisabled();
  });

  it("keeps Template ResRef, Faction, Portrait ResRef, and Treasure Model preserve-only for existing GIT Placeables", () => {
    renderAdvancedDialog({
      provenConversation: "old_conv",
      provenInterruptable: 0,
      provenAnimationState: 0
    });

    expect(screen.getByLabelText("Blueprint ResRef")).toBeDisabled();
    expect(screen.getByLabelText("Belongs To Faction")).toBeDisabled();
    expect(screen.getByLabelText("Portrait ResRef")).toBeDisabled();
    expect(screen.getByLabelText("Treasure Model")).toBeDisabled();
    expect(screen.getByLabelText("Portrait ResRef")).toHaveValue("po_preserve");
  });

  it("enables exact Placeable TemplateResRef only through the Advanced target", () => {
    const onChange = renderAdvancedDialog({ provenTemplateResRef: "plc_chest" });
    const templateResRef = screen.getByLabelText("Blueprint ResRef");

    expect(templateResRef).toBeEnabled();
    expect(templateResRef).toHaveValue("plc_chest");
    expect(templateResRef).toHaveAttribute("maxLength", "16");
    fireEvent.change(templateResRef, { target: { value: "plc_chest_alt" } });
    expect(onChange).toHaveBeenCalledWith("blueprintResRef", "plc_chest_alt");
  });

  it.each([
    ["absent", {}],
    ["uppercase", { provenTemplateResRef: "PLC_CHEST" }],
    ["wrong source", { provenTemplateResRef: "plc_chest", sourceType: "seed" as const }],
    ["wrong family", { provenTemplateResRef: "plc_chest", sourceKind: "creature" as const }],
  ])("keeps Placeable TemplateResRef preserve-only for %s provenance", (_label, options) => {
    renderAdvancedDialog(options);
    expect(screen.getByLabelText("Blueprint ResRef")).toBeDisabled();
  });

  it("edits Treasure Model only through the exact physical bodybag.2da row catalog", () => {
    const tableSha256 = "e".repeat(64);
    const onChange = renderAdvancedDialog({
      provenBodyBag: { expectedValue: 0, tableSha256, tableRowCount: 2 },
      bodyBagCatalog: {
        descriptor: {
          resourceName: "bodybag.2da",
          sourceObjectKey: "modules/current/bodybag.2da",
          sourceLayer: "module",
          sha256: tableSha256,
          sizeBytes: 502,
          rowCount: 2,
        },
        rows: [
          { rowIndex: 0, nameStrRef: 6671, displayName: "Default", displaySource: "strref" },
          { rowIndex: 1, nameStrRef: 66490, displayName: "Treasure", displaySource: "strref" },
        ],
      },
    });
    const treasureModel = screen.getByLabelText("Treasure Model");

    expect(treasureModel).toBeEnabled();
    expect(treasureModel).toHaveValue("0");
    expect(Array.from(treasureModel.querySelectorAll("option"), (option) => option.textContent))
      .toEqual(["0: Default", "1: Treasure"]);
    fireEvent.change(treasureModel, { target: { value: "1" } });
    expect(onChange).toHaveBeenCalledWith("treasureModelRow", 1);
  });

  it("keeps Treasure Model preserve-only for stale bodybag.2da provenance", () => {
    renderAdvancedDialog({
      provenBodyBag: { expectedValue: 0, tableSha256: "e".repeat(64), tableRowCount: 1 },
      bodyBagCatalog: {
        descriptor: {
          resourceName: "bodybag.2da",
          sourceObjectKey: "modules/current/bodybag.2da",
          sourceLayer: "module",
          sha256: "f".repeat(64),
          sizeBytes: 502,
          rowCount: 1,
        },
        rows: [
          { rowIndex: 0, nameStrRef: 6671, displayName: "Default", displaySource: "strref" },
        ],
      },
    });
    expect(screen.getByLabelText("Treasure Model")).toBeDisabled();
  });

  it("edits PortraitId only through exact sparse portraits.2da provenance", () => {
    const tableSha256 = "a".repeat(64);
    const onChange = renderAdvancedDialog({
      provenPortrait: { expectedValue: 462, tableSha256, tableRowCount: 700 },
      portraitCatalog: {
        descriptor: {
          resourceName: "portraits.2da",
          sourceObjectKey: "modules/current/portraits.2da",
          sourceLayer: "module",
          sha256: tableSha256,
          sizeBytes: 4096,
          rowCount: 700,
        },
        rows: [
          { rowIndex: 462, baseResRef: "po_hu_m_01_" },
          { rowIndex: 463, baseResRef: "po_hu_m_02_" },
        ],
      },
    });
    const portrait = screen.getByLabelText("Portrait");

    expect(portrait).toBeEnabled();
    expect(portrait).toHaveValue("462");
    expect(Array.from(portrait.querySelectorAll("option"), (option) => option.textContent))
      .toEqual(["462: po_hu_m_01_", "463: po_hu_m_02_"]);
    fireEvent.change(portrait, { target: { value: "463" } });
    expect(onChange).toHaveBeenCalledWith("portraitId", 463);
  });

  it("edits Faction only through exact physical repute.fac ordinals", () => {
    const catalogSha256 = "b".repeat(64);
    const onChange = renderAdvancedDialog({
      provenFaction: { expectedValue: 1, catalogSha256, catalogFactionCount: 3 },
      factionCatalog: {
        descriptor: {
          resourceName: "repute.fac",
          sourceObjectKey: "modules/current/repute.fac",
          sha256: catalogSha256,
          sizeBytes: 1889,
          factionCount: 3,
        },
        rows: [
          { factionId: 0, name: "PC", parentFactionId: 0xffffffff, isGlobal: true },
          { factionId: 1, name: "Hostile", parentFactionId: 0xffffffff, isGlobal: true },
          { factionId: 2, name: "Commoner", parentFactionId: 0xffffffff, isGlobal: true },
        ],
      },
    });
    const faction = screen.getByLabelText("Belongs To Faction");

    expect(faction).toBeEnabled();
    expect(faction).toHaveValue("1");
    expect(Array.from(faction.querySelectorAll("option"), (option) => option.textContent))
      .toEqual(["0: PC", "1: Hostile", "2: Commoner"]);
    fireEvent.change(faction, { target: { value: "2" } });
    expect(onChange).toHaveBeenCalledWith("factionId", 2);
  });

  it("exposes full ordered CRUD only for an exact Placeable VarTable provenance", () => {
    const handlers = {
      add: vi.fn(),
      update: vi.fn(),
      move: vi.fn(),
      remove: vi.fn(),
    };
    renderAdvancedDialog({
      provenVariables: [
        { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
        { sourceIndex: 1, name: "Label", type: "string", value: "ready" },
      ],
      variableHandlers: handlers,
    });
    const toggle = screen.getByRole("button", { name: "Variables (2)" });
    expect(toggle).toBeEnabled();
    fireEvent.click(toggle);
    const name = screen.getByLabelText("Placeable variable 1 name");
    const value = screen.getByLabelText("Placeable variable 1 value");
    expect(name).toHaveAttribute("maxlength", "64");
    fireEvent.change(name, { target: { value: "Renamed" } });
    expect(handlers.update).toHaveBeenCalledWith(0, {
      name: "Renamed", type: "int", value: 1,
    });
    fireEvent.change(value, { target: { value: "-4" } });
    expect(handlers.update).toHaveBeenCalledWith(0, {
      name: "Counter", type: "int", value: -4,
    });
    fireEvent.click(screen.getByRole("button", { name: "Move placeable variable 1 down" }));
    expect(handlers.move).toHaveBeenCalledWith(0, "down");
    fireEvent.click(screen.getByRole("button", { name: "Remove placeable variable 2" }));
    expect(handlers.remove).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Add variable" }));
    expect(handlers.add).toHaveBeenCalledTimes(1);
  });

  it("keeps Variables preserve-only without exact existing Placeable provenance", () => {
    renderAdvancedDialog();
    expect(screen.getByRole("button", { name: "Variables (0)" })).toBeDisabled();
  });

  it("enables exact proven Comments with the 4096 code-unit UI budget and no normalization", () => {
    const onChange = renderLongTextDialog({
      tab: "comments",
      provenEditorComment: ""
    });
    const comments = screen.getByLabelText("Comments");

    expect(comments).toBeEnabled();
    expect(comments).toHaveAttribute("maxLength", "4096");
    expect(comments).toHaveValue("");
    fireEvent.change(comments, { target: { value: "  New\ne\u0301  " } });
    expect(onChange).toHaveBeenCalledWith("comments", "  New\ne\u0301  ");
  });

  it.each([
    ["absent provenance", {}],
    ["over-budget provenance", { provenEditorComment: "x".repeat(4097) }],
    ["NUL provenance", { provenEditorComment: "bad\u0000value" }],
    ["non-GIT source", { provenEditorComment: "old", sourceType: "seed" as const }],
    ["non-Placeable source", {
      provenEditorComment: "old",
      sourceKind: "creature" as const
    }]
  ])("keeps Comments preserve-only for %s", (_label, options) => {
    renderLongTextDialog({ tab: "comments", ...options });
    expect(screen.getByLabelText("Comments")).toBeDisabled();
  });

  it("enables an exact ordinal-bound inline-ASCII Description with its 4096-byte budget", () => {
    const onChange = renderLongTextDialog({
      tab: "description",
      sourceIndex: 0,
      provenLocalizedStrings: {
        locName: { present: false },
        description: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "TG9jYWxpemVkIGdhbWVwbGF5IGRlc2NyaXB0aW9u" }]
        }
      }
    });
    const description = screen.getByLabelText("Description");
    expect(description).toBeEnabled();
    expect(description).toHaveAttribute("maxLength", "4096");
    expect(description.parentElement).toHaveTextContent("ACTIVE_NOW");
    fireEvent.change(description, { target: { value: " Storage room " } });
    expect(onChange).toHaveBeenCalledWith("description", " Storage room ");
  });

  it("keeps gameplay Description disabled and preserve-only without admitted provenance", () => {
    renderLongTextDialog({
      tab: "description",
      provenEditorComment: "Water Trough"
    });
    expect(screen.getByLabelText("Description")).toBeDisabled();
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Localized gameplay description"
    );
  });
});
