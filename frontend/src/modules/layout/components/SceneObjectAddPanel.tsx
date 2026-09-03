import { useEffect, useMemo, useRef, useState } from "react";
import type { SceneObject } from "../contracts";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import {
  collectItemPaletteFilterOptions,
  formatItemPaletteFilterLabel
} from "../../items/application/itemPaletteTreeFilter";
import {
  composeItemIconPreview,
  resolveDecodedItemIconPreview,
  type ItemIconComposition
} from "../../items/application/itemIconComposer";
import { shouldPreferItemModelThumbnailOverIcon } from "../../items/application/itemThumbnailModelPreference";
import type { ItemApiPaletteTreeResult } from "../../items/contracts";
import {
  type SceneObjectCatalogQueryFacade,
  type SceneObjectCatalogType
} from "../application/sceneObjectCatalogQueryFacade";
import {
  createObjectAddPayloadFromSceneObject,
  OBJECT_ADD_DRAG_MIME,
  setCurrentObjectAddDragPayload,
  setCurrentObjectAddDragSourceTemplate,
  serializeObjectAddPayload
} from "../application/objectAddDragPayload";
import { SceneObjectThumbnail } from "./SceneObjectThumbnail";

interface SceneObjectAddPanelProps {
  userId: string;
  objects: SceneObject[];
  sceneObjectCatalogQueryFacade: SceneObjectCatalogQueryFacade;
  trackTelemetryEvent: (name: string, payload?: TelemetryPayload) => void;
  allowedCatalogTypes?: SceneObjectCatalogType[];
  defaultActiveType?: SceneObjectCatalogType;
  hideUnsupportedCatalogTypes?: boolean;
  showTypeSelector?: boolean;
  placeableRenderPayloadByTemplateId?: Record<string, PlaceableViewportRenderPayload> | null;
  placeableAssetAccessToken?: string | null;
  onObjectRenderPayloadNeeded?: (object: SceneObject) => void;
  thumbnailRenderEnabled?: boolean;
  onObjectPreviewSelect?: (object: SceneObject) => void;
  onObjectCreate?: (object: SceneObject) => void;
  onActiveTypeChange?: (type: ConcreteSceneObjectCatalogType) => void;
  activeCreateObjectId?: string | null;
  itemPaletteTree?: ItemApiPaletteTreeResult | null;
  heading?: string;
  hidden?: boolean;
}

type ConcreteSceneObjectCatalogType = Exclude<SceneObjectCatalogType, "all">;
type BlueprintSourceFilter = "standard" | "custom";
type ItemPaletteCategoryId =
  | "all"
  | "armor"
  | "creature_items"
  | "magic_items"
  | "miscellaneous"
  | "plot_item"
  | "potions_scrolls"
  | "tutorial"
  | "weapons";

interface PaletteFamilyButtonDefinition {
  type: ConcreteSceneObjectCatalogType;
  label: string;
  shortLabel: string;
}

interface ItemPaletteCategoryDefinition {
  id: ItemPaletteCategoryId;
  label: string;
}

const PALETTE_FAMILY_BUTTONS: PaletteFamilyButtonDefinition[] = [
  { type: "creatures", label: "Creatures", shortLabel: "CRT" },
  { type: "items", label: "Items", shortLabel: "ITM" },
  { type: "placeables", label: "Placeables", shortLabel: "PLC" },
  { type: "doors", label: "Doors", shortLabel: "DOR" },
  { type: "sounds", label: "Sounds", shortLabel: "SND" },
  { type: "triggers", label: "Triggers", shortLabel: "TRG" },
  { type: "waypoints", label: "Waypoints", shortLabel: "WPT" },
  { type: "encounters", label: "Encounters", shortLabel: "ENC" },
  { type: "stores", label: "Stores", shortLabel: "STO" },
  { type: "vfx", label: "VFX", shortLabel: "VFX" },
  { type: "ground_items", label: "Ground Items", shortLabel: "GND" }
];

const BLUEPRINT_SOURCE_FILTERS: Array<{ id: BlueprintSourceFilter; label: string }> = [
  { id: "standard", label: "Standard" },
  { id: "custom", label: "Custom" }
];

const ITEM_PALETTE_CATEGORIES: ItemPaletteCategoryDefinition[] = [
  { id: "all", label: "All" },
  { id: "armor", label: "Armor" },
  { id: "weapons", label: "Weapons" },
  { id: "potions_scrolls", label: "Potions / Scrolls" },
  { id: "magic_items", label: "Magic Items" },
  { id: "miscellaneous", label: "Miscellaneous" },
  { id: "creature_items", label: "Creature Items" },
  { id: "plot_item", label: "Plot Item" },
  { id: "tutorial", label: "Tutorial" }
];

const ADD_OBJECT_RENDER_ROW_LIMIT = 120;
const ITEM_ICON_DECODE_BATCH_SIZE = 16;
const ITEM_ICON_DECODE_RETRY_LIMIT = 2;
const ITEM_ICON_DECODE_RETRY_DELAY_MS = 900;

const AURORA_STORE_PANEL_ITEM_CATEGORIES = new Map<number, ItemPaletteCategoryId>([
  [0, "armor"],
  [1, "weapons"],
  [2, "potions_scrolls"],
  [3, "magic_items"],
  [4, "miscellaneous"]
]);

const TRANSPARENT_DRAG_IMAGE_DATA_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function setTransparentDragImage(dataTransfer: DataTransfer): void {
  if (typeof dataTransfer.setDragImage !== "function") {
    return;
  }
  const image = new Image();
  image.src = TRANSPARENT_DRAG_IMAGE_DATA_URL;
  dataTransfer.setDragImage(image, 0, 0);
}

function trimTagForPreview(tag: string): string {
  return tag.slice(0, 8).toUpperCase();
}

function resolveItemIconPreviewCacheKey(preview: ItemIconComposition): string {
  return `${preview.iconResRef}:${preview.assetId ?? preview.rawAssetUrl ?? preview.source}`;
}

function resolvePersistedBackendAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem("aurora_web.auth_session.v1");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as {
      session?: {
        accessToken?: unknown;
      };
    };
    const token = parsed.session?.accessToken;
    return typeof token === "string" && token.trim().length > 0 ? token.trim() : null;
  } catch {
    return null;
  }
}

function toConcreteTypes(types: SceneObjectCatalogType[]): ConcreteSceneObjectCatalogType[] {
  return types.filter((type): type is ConcreteSceneObjectCatalogType => type !== "all");
}

function dedupeTemplatesByResRef(objects: SceneObject[]): SceneObject[] {
  const templatesByKey = new Map<string, SceneObject>();
  objects.forEach((object) => {
    const normalizedResRef = object.resRef.trim().toLowerCase();
    const normalizedTag = object.tag.trim().toLowerCase();
    const templateKey = `${object.kind}::${normalizedResRef || normalizedTag || object.id}`;
    if (!templatesByKey.has(templateKey)) {
      templatesByKey.set(templateKey, object);
    }
  });
  return Array.from(templatesByKey.values());
}

function resolvePaletteFamilyDefinition(
  type: ConcreteSceneObjectCatalogType
): PaletteFamilyButtonDefinition {
  return (
    PALETTE_FAMILY_BUTTONS.find((definition) => definition.type === type) ?? {
      type,
      label: type,
      shortLabel: type.slice(0, 3).toUpperCase()
    }
  );
}

function resolveBlueprintSource(object: SceneObject): BlueprintSourceFilter {
  const sourceText = [
    object.source?.templateId,
    object.source?.sourceObjectId,
    object.source?.sourceKind,
    object.resRef,
    object.tag
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

  if (
    sourceText.includes("custom:") ||
    sourceText.includes("/custom/") ||
    sourceText.includes("module_custom")
  ) {
    return "custom";
  }
  return "standard";
}

function resolveBlueprintSourceLabel(source: BlueprintSourceFilter): string {
  return BLUEPRINT_SOURCE_FILTERS.find((entry) => entry.id === source)?.label ?? source;
}

function resolveItemPaletteCategory(object: SceneObject): ItemPaletteCategoryId {
  const properties = object.itemProperties;
  const text = [
    object.tag,
    object.resRef,
    object.name,
    object.source?.templateId,
    properties?.baseItemLabel,
    properties?.baseItemItemClass,
    properties?.baseItemModelType
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (properties?.plot === true || text.includes("plot") || text.includes("journal") || text.includes("quest")) {
    return "plot_item";
  }
  if (text.includes("tutorial")) {
    return "tutorial";
  }
  if (
    text.includes("creature") ||
    text.includes("cslashweapon") ||
    text.includes("cpiercweapon") ||
    text.includes("cbludgweapon") ||
    text.includes("cslshprcweap") ||
    text.includes("claw") ||
    text.includes("skin") ||
    text.includes("it_cr_") ||
    (text.includes("hide") && !text.includes("armor") && !text.includes("armour"))
  ) {
    return "creature_items";
  }

  const storePanelCategory =
    typeof properties?.baseItemStorePanel === "number"
      ? AURORA_STORE_PANEL_ITEM_CATEGORIES.get(properties.baseItemStorePanel)
      : undefined;
  if (storePanelCategory) {
    return storePanelCategory;
  }

  if (text.includes("armor") || text.includes("armour") || text.includes("_it_ar")) {
    return "armor";
  }
  if (
    text.includes("weapon") ||
    text.includes("sword") ||
    text.includes("axe") ||
    text.includes("bow") ||
    text.includes("mace") ||
    text.includes("_ws") ||
    text.includes("wsw")
  ) {
    return "weapons";
  }
  return "miscellaneous";
}

interface SceneObjectAddRowProps {
  object: SceneObject;
  activeType: ConcreteSceneObjectCatalogType;
  userId: string;
  trackTelemetryEvent: (name: string, payload?: TelemetryPayload) => void;
  renderPayload?: PlaceableViewportRenderPayload | null;
  placeableAssetAccessToken?: string | null;
  onObjectRenderPayloadNeeded?: (object: SceneObject) => void;
  thumbnailRenderEnabled?: boolean;
  onObjectPreviewSelect?: (object: SceneObject) => void;
  onObjectCreate?: (object: SceneObject) => void;
  activeCreateObjectId?: string | null;
}

function SceneObjectAddRow({
  object,
  activeType,
  userId,
  trackTelemetryEvent,
  renderPayload,
  placeableAssetAccessToken,
  onObjectRenderPayloadNeeded,
  thumbnailRenderEnabled,
  onObjectPreviewSelect,
  onObjectCreate,
  activeCreateObjectId
}: SceneObjectAddRowProps) {
  const suppressPreviewClickRef = useRef(false);
  const blueprintSource = resolveBlueprintSource(object);
  const blueprintSourceLabel = resolveBlueprintSourceLabel(blueprintSource);
  const isActiveCreateObject = activeCreateObjectId === object.id;
  const shouldPreferModelPreview = shouldPreferItemModelThumbnailOverIcon(object);
  const placeObjectFromRow = (source: "row_double_click" | "row_action" | "row_keyboard") => {
    onObjectCreate?.(object);
    if (onObjectCreate) {
      trackTelemetryEvent("ui.workspace.add_objects.create_clicked", {
        userId,
        objectId: object.id,
        objectKind: object.kind,
        objectType: activeType,
        source
      });
    }
  };

  return (
    <li className="scene-object-add-list-item">
      <button
        type="button"
        draggable
        className={`scene-object-row scene-object-add-row${isActiveCreateObject ? " is-armed" : ""}`}
        aria-label={`Preview ${object.tag}`}
        aria-current={isActiveCreateObject ? "true" : undefined}
        aria-keyshortcuts={onObjectCreate ? "Enter Space Control+Enter Shift+Enter" : "Enter Space"}
        title={
          isActiveCreateObject
            ? `Placing ${object.tag}; click tiles in the canvas`
            : onObjectCreate
              ? `Preview ${object.tag}; Ctrl+Enter places it`
              : `Preview ${object.tag}`
        }
        onClick={() => {
          if (suppressPreviewClickRef.current) {
            suppressPreviewClickRef.current = false;
            return;
          }
          onObjectPreviewSelect?.(object);
        }}
        onDoubleClick={() => {
          placeObjectFromRow("row_double_click");
        }}
        onDragStart={(event) => {
          suppressPreviewClickRef.current = true;
          const payload = createObjectAddPayloadFromSceneObject(object);
          setCurrentObjectAddDragPayload(payload);
          setCurrentObjectAddDragSourceTemplate(object);
          event.dataTransfer.effectAllowed = "copy";
          setTransparentDragImage(event.dataTransfer);
          event.dataTransfer.setData(
            OBJECT_ADD_DRAG_MIME,
            serializeObjectAddPayload(payload)
          );
          trackTelemetryEvent("ui.workspace.add_objects.drag_started", {
            userId,
            objectId: object.id,
            objectKind: object.kind,
            objectType: activeType
          });
        }}
        onDragEnd={() => {
          setTimeout(() => {
            suppressPreviewClickRef.current = false;
          }, 0);
          setCurrentObjectAddDragPayload(null);
          setCurrentObjectAddDragSourceTemplate(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (
              event.key === "Enter" &&
              onObjectCreate &&
              (event.ctrlKey || event.metaKey || event.shiftKey)
            ) {
              placeObjectFromRow("row_keyboard");
              return;
            }
            onObjectPreviewSelect?.(object);
          }
        }}
      >
        <SceneObjectThumbnail
          object={object}
          fallbackLabel={trimTagForPreview(object.tag)}
          renderPayload={renderPayload}
          placeableAssetAccessToken={placeableAssetAccessToken}
          onRenderPayloadNeeded={onObjectRenderPayloadNeeded}
          thumbnailRenderEnabled={thumbnailRenderEnabled}
          preferModelPreview={shouldPreferModelPreview}
        />
        <span className="scene-object-row-meta scene-object-add-row-meta">
          <strong>{object.tag}</strong>
          <small>{object.resRef}</small>
          <span className="scene-object-add-row-badges" aria-hidden="true">
            <span
              className={`scene-object-add-row-source-badge scene-object-add-row-source-badge-${blueprintSource}`}
              title={`Blueprint source: ${blueprintSourceLabel}`}
            >
              {blueprintSourceLabel}
            </span>
            {isActiveCreateObject ? (
              <span
                className="scene-object-add-row-armed-badge"
                title="This template is armed for repeated canvas placement"
              >
                Armed
              </span>
            ) : null}
          </span>
        </span>
      </button>
      {onObjectCreate ? (
        <button
          type="button"
          className="scene-object-row-action"
          aria-label="Place object on canvas"
          title={`Place ${object.tag} on canvas`}
          onClick={() => {
            placeObjectFromRow("row_action");
          }}
        >
          Place
        </button>
      ) : null}
    </li>
  );
}

export function SceneObjectAddPanel({
  userId,
  objects,
  sceneObjectCatalogQueryFacade,
  trackTelemetryEvent,
  allowedCatalogTypes,
  defaultActiveType,
  hideUnsupportedCatalogTypes = false,
  showTypeSelector = true,
  placeableRenderPayloadByTemplateId,
  placeableAssetAccessToken,
  onObjectRenderPayloadNeeded,
  thumbnailRenderEnabled = true,
  onObjectPreviewSelect,
  onObjectCreate,
  onActiveTypeChange,
  activeCreateObjectId,
  itemPaletteTree,
  heading = "Add Objects",
  hidden = false
}: SceneObjectAddPanelProps) {
  const templateObjects = useMemo(() => dedupeTemplatesByResRef(objects), [objects]);
  const itemPaletteOptions = useMemo(
    () => collectItemPaletteFilterOptions(itemPaletteTree?.roots ?? []),
    [itemPaletteTree]
  );
  const baseViewModel = useMemo(
    () =>
      sceneObjectCatalogQueryFacade.query({
        objects: templateObjects,
        activeType: "all",
        searchQuery: ""
      }),
    [templateObjects, sceneObjectCatalogQueryFacade]
  );

  const allConcreteTypes = useMemo(
    () => [
      ...toConcreteTypes(baseViewModel.mvpTypes.map((entry) => entry.key)),
      ...toConcreteTypes(baseViewModel.postMvpTypes.map((entry) => entry.key))
    ],
    [baseViewModel.mvpTypes, baseViewModel.postMvpTypes]
  );
  const allowedTypeSet = useMemo(() => {
    if (!allowedCatalogTypes || allowedCatalogTypes.length === 0) {
      return new Set<ConcreteSceneObjectCatalogType>(allConcreteTypes);
    }
    const filtered = toConcreteTypes(allowedCatalogTypes).filter((type) =>
      allConcreteTypes.includes(type)
    );
    return new Set<ConcreteSceneObjectCatalogType>(filtered.length > 0 ? filtered : allConcreteTypes);
  }, [allConcreteTypes, allowedCatalogTypes]);
  const selectableMvpTypes = useMemo(
    () =>
      toConcreteTypes(baseViewModel.mvpTypes.map((entry) => entry.key)).filter((type) =>
        allowedTypeSet.has(type)
      ),
    [allowedTypeSet, baseViewModel.mvpTypes]
  );
  const selectablePostMvpTypes = useMemo(
    () =>
      toConcreteTypes(baseViewModel.postMvpTypes.map((entry) => entry.key)).filter((type) =>
        allowedTypeSet.has(type)
      ),
    [allowedTypeSet, baseViewModel.postMvpTypes]
  );
  const fallbackType = selectablePostMvpTypes[0] ?? "placeables";
  const fallbackDefaultType = selectableMvpTypes[0] ?? fallbackType;
  const forcedActiveType: ConcreteSceneObjectCatalogType | null = showTypeSelector
    ? null
    : "placeables";
  const resolvedDefaultType = (() => {
    if (forcedActiveType) {
      return forcedActiveType;
    }
    if (defaultActiveType && defaultActiveType !== "all") {
      const candidate = defaultActiveType as ConcreteSceneObjectCatalogType;
      if (allowedTypeSet.has(candidate)) {
        return candidate;
      }
    }
    return fallbackDefaultType;
  })();

  const [activeType, setActiveType] = useState<ConcreteSceneObjectCatalogType>(resolvedDefaultType);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBlueprintSource, setActiveBlueprintSource] =
    useState<BlueprintSourceFilter>("standard");
  const [activeItemCategory, setActiveItemCategory] = useState<ItemPaletteCategoryId>("all");
  const [activeItemPaletteNodeId, setActiveItemPaletteNodeId] = useState("all");
  const activeItemPaletteOption = useMemo(
    () =>
      itemPaletteOptions.find((option) => option.nodeId === activeItemPaletteNodeId) ??
      null,
    [activeItemPaletteNodeId, itemPaletteOptions]
  );

  useEffect(() => {
    if (forcedActiveType && activeType !== forcedActiveType) {
      setActiveType(forcedActiveType);
      return;
    }
    if (!allowedTypeSet.has(activeType)) {
      setActiveType(resolvedDefaultType);
    }
  }, [activeType, allowedTypeSet, forcedActiveType, resolvedDefaultType]);

  useEffect(() => {
    onActiveTypeChange?.(activeType);
  }, [activeType, onActiveTypeChange]);

  const catalogViewModel = useMemo(
    () =>
      sceneObjectCatalogQueryFacade.query({
        objects: templateObjects,
        activeType,
        searchQuery
      }),
    [activeType, templateObjects, sceneObjectCatalogQueryFacade, searchQuery]
  );

  const { groupedRows, filteredRows: catalogFilteredRows, activeDefinition } = catalogViewModel;
  const familyButtons = useMemo(() => {
    const visibleTypes = [...selectableMvpTypes, ...selectablePostMvpTypes];
    return visibleTypes.map((type) => ({
      ...resolvePaletteFamilyDefinition(type),
      count: groupedRows[type]?.length ?? 0
    }));
  }, [groupedRows, selectableMvpTypes, selectablePostMvpTypes]);
  const blueprintSourceCounts = useMemo(
    () =>
      BLUEPRINT_SOURCE_FILTERS.reduce<Record<BlueprintSourceFilter, number>>(
        (counts, source) => {
          counts[source.id] = catalogFilteredRows.filter(
            (object) => resolveBlueprintSource(object) === source.id
          ).length;
          return counts;
        },
        { standard: 0, custom: 0 }
      ),
    [catalogFilteredRows]
  );
  const sourceFilteredRows = useMemo(
    () =>
      catalogFilteredRows.filter(
        (object) => resolveBlueprintSource(object) === activeBlueprintSource
      ),
    [activeBlueprintSource, catalogFilteredRows]
  );
  const itemPaletteFilteredRows = useMemo(() => {
    if (activeType !== "items" || !activeItemPaletteOption) {
      return sourceFilteredRows;
    }
    const allowedResRefs = new Set(activeItemPaletteOption.resRefs);
    return sourceFilteredRows.filter(
      (object) => object.kind !== "items" || allowedResRefs.has(object.resRef.trim().toLowerCase())
    );
  }, [activeItemPaletteOption, activeType, sourceFilteredRows]);
  const itemCategoryCounts = useMemo(
    () =>
      ITEM_PALETTE_CATEGORIES.reduce<Record<ItemPaletteCategoryId, number>>(
        (counts, category) => {
          counts[category.id] =
            category.id === "all"
              ? itemPaletteFilteredRows.length
              : itemPaletteFilteredRows.filter(
                  (object) => object.kind === "items" && resolveItemPaletteCategory(object) === category.id
                ).length;
          return counts;
        },
        {
          all: 0,
          armor: 0,
          creature_items: 0,
          magic_items: 0,
          miscellaneous: 0,
          plot_item: 0,
          potions_scrolls: 0,
          tutorial: 0,
          weapons: 0
        }
      ),
    [itemPaletteFilteredRows]
  );
  const filteredRows = useMemo(() => {
    if (activeType !== "items" || activeItemCategory === "all") {
      return itemPaletteFilteredRows;
    }
    return itemPaletteFilteredRows.filter(
      (object) => object.kind === "items" && resolveItemPaletteCategory(object) === activeItemCategory
    );
  }, [activeItemCategory, activeType, itemPaletteFilteredRows]);
  const renderedRows = useMemo(
    () => filteredRows.slice(0, ADD_OBJECT_RENDER_ROW_LIMIT),
    [filteredRows]
  );
  const renderedItemIconPreviews = useMemo(() => {
    const previews = new Map<string, ItemIconComposition>();
    if (activeType !== "items") {
      return previews;
    }
    renderedRows.forEach((object) => {
      const preview = composeItemIconPreview(object);
      if (preview) {
        previews.set(object.id, preview);
      }
    });
    return previews;
  }, [activeType, renderedRows]);
  const authenticatedItemIconFetch = useMemo<typeof fetch | undefined>(() => {
    if (typeof fetch === "undefined") {
      return undefined;
    }
    return (input, init) => {
      const token = resolvePersistedBackendAccessToken();
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    };
  }, []);
  const [decodedItemIconPreviews, setDecodedItemIconPreviews] = useState<
    Record<string, ItemIconComposition>
  >({});
  const [itemIconDecodeAttempts, setItemIconDecodeAttempts] = useState<Record<string, number>>(
    {}
  );
  useEffect(() => {
    if (activeType !== "items") {
      return;
    }
    const rawPreviews = [...renderedItemIconPreviews.values()]
      .filter((preview) => preview.source === "raw-texture")
      .filter((preview) => !decodedItemIconPreviews[resolveItemIconPreviewCacheKey(preview)])
      .filter(
        (preview) =>
          (itemIconDecodeAttempts[resolveItemIconPreviewCacheKey(preview)] ?? 0) <
          ITEM_ICON_DECODE_RETRY_LIMIT
      )
      .slice(0, ITEM_ICON_DECODE_BATCH_SIZE);
    if (rawPreviews.length < 1) {
      return;
    }

    let cancelled = false;
    const retryTimers: number[] = [];
    rawPreviews.forEach((preview) => {
      const cacheKey = resolveItemIconPreviewCacheKey(preview);
      void resolveDecodedItemIconPreview(preview, authenticatedItemIconFetch)
        .then((decoded) => {
          if (cancelled) {
            return;
          }
          if (!decoded?.previewImageUrl) {
            const timer = window.setTimeout(() => {
              if (!cancelled) {
                setItemIconDecodeAttempts((current) => ({
                  ...current,
                  [cacheKey]: (current[cacheKey] ?? 0) + 1
                }));
              }
            }, ITEM_ICON_DECODE_RETRY_DELAY_MS);
            retryTimers.push(timer);
            return;
          }
          setDecodedItemIconPreviews((current) =>
            current[cacheKey]?.previewImageUrl === decoded.previewImageUrl
              ? current
              : { ...current, [cacheKey]: decoded }
          );
        })
        .catch(() => {
          const timer = window.setTimeout(() => {
            if (!cancelled) {
              setItemIconDecodeAttempts((current) => ({
                ...current,
                [cacheKey]: (current[cacheKey] ?? 0) + 1
              }));
            }
          }, ITEM_ICON_DECODE_RETRY_DELAY_MS);
          retryTimers.push(timer);
        });
    });

    return () => {
      cancelled = true;
      retryTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [
    activeType,
    authenticatedItemIconFetch,
    decodedItemIconPreviews,
    itemIconDecodeAttempts,
    renderedItemIconPreviews
  ]);
  const renderedRowsWithItemPreviews = useMemo(() => {
    if (activeType !== "items") {
      return renderedRows;
    }
    return renderedRows.map((object) => {
      const basePreview = renderedItemIconPreviews.get(object.id);
      if (!basePreview) {
        return object;
      }
      const preview =
        decodedItemIconPreviews[resolveItemIconPreviewCacheKey(basePreview)] ?? basePreview;
      return preview.previewImageUrl && !shouldPreferItemModelThumbnailOverIcon(object)
        ? { ...object, previewImageUrl: preview.previewImageUrl }
        : object;
    });
  }, [activeType, decodedItemIconPreviews, renderedItemIconPreviews, renderedRows]);
  const hiddenRowCount = Math.max(0, filteredRows.length - renderedRows.length);
  const activeTypeTotal = catalogViewModel.activeRows.length;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasUserActiveFilters =
    hasSearchQuery ||
    activeBlueprintSource !== "standard" ||
    (activeType === "items" && activeItemPaletteOption !== null) ||
    (activeType === "items" && activeItemCategory !== "all");
  const hasNarrowedResults = hasUserActiveFilters || filteredRows.length !== activeTypeTotal;
  const addObjectResultLabel = hasNarrowedResults
    ? `${filteredRows.length}/${activeTypeTotal}`
    : String(filteredRows.length);
  const activeFamilyTemplateLabel = `${activeTypeTotal} ${
    activeTypeTotal === 1 ? "template" : "templates"
  }`;
  const resetAddObjectFilters = () => {
    setSearchQuery("");
    setActiveBlueprintSource("standard");
    setActiveItemPaletteNodeId("all");
    setActiveItemCategory("all");
    trackTelemetryEvent("ui.workspace.add_objects.filters_reset", {
      userId,
      objectType: activeType
    });
  };

  useEffect(() => {
    if (activeType !== "items" && activeItemCategory !== "all") {
      setActiveItemCategory("all");
    }
  }, [activeItemCategory, activeType]);

  useEffect(() => {
    if (
      activeItemPaletteNodeId !== "all" &&
      !itemPaletteOptions.some((option) => option.nodeId === activeItemPaletteNodeId)
    ) {
      setActiveItemPaletteNodeId("all");
    }
  }, [activeItemPaletteNodeId, itemPaletteOptions]);

  return (
    <article
      className="sidebar-section scene-objects-section scene-object-add-panel"
      aria-label="add objects section"
      hidden={hidden}
    >
      <div className="scene-object-add-control-stack">
        <header className="scene-objects-header scene-object-add-panel-header">
          <h2>{heading}</h2>
          <span
            className="scene-objects-total"
            title={hasNarrowedResults ? "Visible templates / active family templates" : "Visible templates"}
          >
            {addObjectResultLabel}
          </span>
        </header>
        <p className="scene-object-add-panel-note">Place objects onto area tiles.</p>

        {showTypeSelector ? (
          <div className="scene-objects-palette-controls">
            <div
              className="scene-objects-palette-family-rail"
              role="tablist"
              aria-label="Object family palette"
            >
            {familyButtons.map((entry) => {
              const isActiveFamily = activeType === entry.type;
              const isDisabledFamily = !isActiveFamily && entry.count === 0;
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActiveFamily}
                  aria-disabled={isDisabledFamily ? "true" : undefined}
                  aria-label={`${entry.label} family, ${entry.count} templates`}
                  className={`scene-objects-palette-family-btn${
                    isActiveFamily ? " is-active" : ""
                  }${isDisabledFamily ? " is-disabled" : ""}`}
                  disabled={isDisabledFamily}
                  key={entry.type}
                  title={
                    isDisabledFamily
                      ? `No ${entry.label.toLowerCase()} templates available`
                      : `${entry.label} (${entry.count})`
                  }
                  onClick={() => {
                    if (isActiveFamily || isDisabledFamily) {
                      return;
                    }
                    setActiveType(entry.type);
                    setActiveBlueprintSource("standard");
                    setActiveItemPaletteNodeId("all");
                    setActiveItemCategory("all");
                    trackTelemetryEvent("ui.workspace.add_objects.type_changed", {
                      userId,
                      objectType: entry.type,
                      count: entry.count,
                      source: "palette_rail"
                    });
                  }}
                >
                  <span className="scene-objects-palette-family-glyph" aria-hidden="true">
                    {entry.shortLabel}
                  </span>
                  <span className="scene-objects-palette-family-count">{entry.count}</span>
                </button>
              );
            })}
            </div>
            <div
              className="scene-objects-active-family"
              role="group"
              aria-label="Active add object family"
            >
              <span className="scene-objects-active-family-label">{activeDefinition.label}</span>
              {" "}
              <span className="scene-objects-active-family-count">
                {activeFamilyTemplateLabel}
              </span>
            </div>

            <label className="scene-objects-type-picker scene-objects-type-picker-fallback">
              <span>Type</span>
              <select
                aria-label="Add object type selector"
                value={activeType}
                onChange={(event) => {
                  const nextType = event.target.value as ConcreteSceneObjectCatalogType;
                  if (!allowedTypeSet.has(nextType)) {
                    return;
                  }
                  const count = groupedRows[nextType]?.length ?? 0;
                  setActiveType(nextType);
                  setActiveBlueprintSource("standard");
                  setActiveItemPaletteNodeId("all");
                  setActiveItemCategory("all");
                  trackTelemetryEvent("ui.workspace.add_objects.type_changed", {
                    userId,
                    objectType: nextType,
                    count,
                    source: "selector"
                  });
                }}
              >
                {(!hideUnsupportedCatalogTypes ||
                  baseViewModel.mvpTypes.some(
                    (entry) =>
                      entry.key !== "all" &&
                      allowedTypeSet.has(entry.key as ConcreteSceneObjectCatalogType)
                  )) && (
                  <optgroup label="MVP">
                    {baseViewModel.mvpTypes
                      .filter((entry) => entry.key !== "all")
                      .map((entry) => {
                        const key = entry.key as ConcreteSceneObjectCatalogType;
                        const allowed = allowedTypeSet.has(key);
                        if (hideUnsupportedCatalogTypes && !allowed) {
                          return null;
                        }
                        const count = groupedRows[entry.key]?.length ?? 0;
                        return (
                          <option value={entry.key} key={entry.key} disabled={!allowed}>
                            {entry.label} ({count})
                          </option>
                        );
                      })}
                  </optgroup>
                )}
                {(!hideUnsupportedCatalogTypes ||
                  baseViewModel.postMvpTypes.some((entry) =>
                    allowedTypeSet.has(entry.key as ConcreteSceneObjectCatalogType)
                  )) && (
                  <optgroup label="Post-MVP">
                    {baseViewModel.postMvpTypes.map((entry) => {
                      const key = entry.key as ConcreteSceneObjectCatalogType;
                      const allowed = allowedTypeSet.has(key);
                      if (hideUnsupportedCatalogTypes && !allowed) {
                        return null;
                      }
                      const count = groupedRows[entry.key]?.length ?? 0;
                      return (
                        <option value={entry.key} key={entry.key} disabled={!allowed}>
                          {entry.label} ({count})
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>
            </label>
          </div>
        ) : null}

        <div
          className="scene-objects-blueprint-source-tabs"
          role="tablist"
          aria-label="Blueprint source"
        >
          {BLUEPRINT_SOURCE_FILTERS.map((source) => {
            const sourceCount = blueprintSourceCounts[source.id];
            const isActiveSource = activeBlueprintSource === source.id;
            const isDisabledSource = !isActiveSource && sourceCount === 0;
            return (
              <button
                type="button"
                role="tab"
                aria-selected={isActiveSource}
                aria-disabled={isDisabledSource ? "true" : undefined}
                disabled={isDisabledSource}
                className={`scene-objects-blueprint-source-tab${
                  isActiveSource ? " is-active" : ""
                }${isDisabledSource ? " is-disabled" : ""}`}
                key={source.id}
                title={
                  isDisabledSource
                    ? `No ${source.label.toLowerCase()} templates match current filters`
                    : `${source.label} (${sourceCount})`
                }
                onClick={() => {
                  if (isDisabledSource) {
                    return;
                  }
                  setActiveBlueprintSource(source.id);
                  trackTelemetryEvent("ui.workspace.add_objects.source_changed", {
                    userId,
                    objectType: activeType,
                    source: source.id,
                    count: sourceCount
                  });
                }}
              >
                <span>{source.label}</span>
                <span className="scene-objects-blueprint-source-count">{sourceCount}</span>
              </button>
            );
          })}
        </div>

        {activeType === "items" && itemPaletteOptions.length > 0 ? (
          <div
            className="scene-objects-item-palette-filter"
            aria-label="Add item palette tree"
          >
            <label>
              <span>Palette</span>
              <select
                aria-label="Add item palette category"
                value={activeItemPaletteNodeId}
                onChange={(event) => {
                  const nextNodeId = event.target.value;
                  setActiveItemPaletteNodeId(nextNodeId);
                  trackTelemetryEvent("ui.workspace.add_objects.item_palette_changed", {
                    userId,
                    nodeId: nextNodeId,
                    objectType: activeType
                  });
                }}
              >
                <option value="all">
                  All palette items ({itemPaletteTree?.leafCount ?? itemPaletteOptions.length})
                </option>
                {itemPaletteOptions.map((option) => (
                  <option key={option.nodeId} value={option.nodeId}>
                    {formatItemPaletteFilterLabel(option)}
                  </option>
                ))}
              </select>
            </label>
            <small>
              {activeItemPaletteOption
                ? `${activeItemPaletteOption.resRefs.length} resrefs from ${itemPaletteTree?.activeSource ?? "itempal"}`
                : `${itemPaletteTree?.rootCount ?? 0} roots / ${itemPaletteTree?.leafCount ?? 0} leaves`}
            </small>
          </div>
        ) : null}

        {activeType === "items" ? (
          <div
            className="scene-objects-item-category-panel"
            role="group"
            aria-label="Item palette categories"
          >
            {ITEM_PALETTE_CATEGORIES.map((category) => (
              <button
                type="button"
                className={`scene-objects-item-category-btn${
                  activeItemCategory === category.id ? " is-active" : ""
                }`}
                aria-pressed={activeItemCategory === category.id}
                key={category.id}
                onClick={() => {
                  setActiveItemCategory(category.id);
                  trackTelemetryEvent("ui.workspace.add_objects.item_category_changed", {
                    userId,
                    category: category.id,
                    count: itemCategoryCounts[category.id]
                  });
                }}
              >
                <span>{category.label}</span>
                <span className="scene-objects-item-category-count">
                  {itemCategoryCounts[category.id]}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="scene-objects-search">
          <input
            type="search"
            aria-label="Filter objects"
            value={searchQuery}
            onChange={(event) => {
              const nextValue = event.target.value;
              setSearchQuery(nextValue);
              trackTelemetryEvent("ui.workspace.add_objects.filter_changed", {
                userId,
                objectType: activeType,
                query: nextValue
              });
            }}
            placeholder="Filter by tag / resref"
          />
          {searchQuery ? (
            <button
              type="button"
              className="scene-objects-search-clear"
              aria-label="Clear add objects filter"
              title="Clear filter"
              onClick={() => setSearchQuery("")}
            >
              X
            </button>
          ) : null}
        </div>

        {hasUserActiveFilters ? (
          <button
            type="button"
            className="scene-objects-filter-reset"
            aria-label="Reset add object filters"
            onClick={resetAddObjectFilters}
          >
            Reset filters
          </button>
        ) : null}
      </div>

      {filteredRows.length === 0 ? (
        <p className="scene-objects-empty" role="status">
          {hasNarrowedResults
            ? `No ${activeDefinition.label.toLowerCase()} match the current filters.`
            : `No ${activeDefinition.label.toLowerCase()} objects available.`}
        </p>
      ) : (
        <>
          {hiddenRowCount > 0 ? (
            <p className="scene-objects-result-window" role="status">
              Showing {renderedRows.length} of {filteredRows.length} matches.
            </p>
          ) : null}
          <ul
            className="scene-object-list scene-object-add-list"
            aria-label={`${activeDefinition.label} add list`}
          >
            {renderedRowsWithItemPreviews.map((object) => (
              <SceneObjectAddRow
                key={object.id}
                object={object}
                activeType={activeType}
                userId={userId}
                trackTelemetryEvent={trackTelemetryEvent}
                renderPayload={placeableRenderPayloadByTemplateId?.[object.id] ?? null}
                placeableAssetAccessToken={placeableAssetAccessToken}
                onObjectRenderPayloadNeeded={onObjectRenderPayloadNeeded}
                thumbnailRenderEnabled={thumbnailRenderEnabled}
                onObjectPreviewSelect={onObjectPreviewSelect}
                onObjectCreate={onObjectCreate}
                activeCreateObjectId={activeCreateObjectId}
              />
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
