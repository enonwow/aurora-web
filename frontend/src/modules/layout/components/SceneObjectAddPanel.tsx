import { useEffect, useMemo, useRef, useState } from "react";
import type { SceneObject } from "../contracts";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import {
  type SceneObjectCatalogQueryFacade,
  type SceneObjectCatalogType
} from "../application/sceneObjectCatalogQueryFacade";
import {
  createObjectAddPayloadFromSceneObject,
  OBJECT_ADD_DRAG_MIME,
  setCurrentObjectAddDragPayload,
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
  onObjectPreviewSelect?: (object: SceneObject) => void;
  onObjectCreate?: (object: SceneObject) => void;
  activeCreateObjectId?: string | null;
}

type ConcreteSceneObjectCatalogType = Exclude<SceneObjectCatalogType, "all">;
type BlueprintSourceFilter = "standard" | "custom";
type ItemPaletteCategoryId =
  | "all"
  | "armor"
  | "creature_items"
  | "miscellaneous"
  | "plot_item"
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
  { id: "creature_items", label: "Creature Items" },
  { id: "miscellaneous", label: "Miscellaneous" },
  { id: "plot_item", label: "Plot Item" },
  { id: "tutorial", label: "Tutorial" },
  { id: "weapons", label: "Weapons" }
];

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
  const text = [object.tag, object.resRef, object.name, object.source?.templateId]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (text.includes("armor") || text.includes("armour") || text.includes("_it_ar")) {
    return "armor";
  }
  if (
    text.includes("creature") ||
    text.includes("hide") ||
    text.includes("claw") ||
    text.includes("skin")
  ) {
    return "creature_items";
  }
  if (text.includes("plot") || text.includes("journal") || text.includes("quest")) {
    return "plot_item";
  }
  if (text.includes("tutorial")) {
    return "tutorial";
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
  onObjectPreviewSelect,
  onObjectCreate,
  activeCreateObjectId
}: SceneObjectAddRowProps) {
  const suppressPreviewClickRef = useRef(false);
  const blueprintSource = resolveBlueprintSource(object);
  const blueprintSourceLabel = resolveBlueprintSourceLabel(blueprintSource);
  const isActiveCreateObject = activeCreateObjectId === object.id;
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
  onObjectPreviewSelect,
  onObjectCreate,
  activeCreateObjectId
}: SceneObjectAddPanelProps) {
  const templateObjects = useMemo(() => dedupeTemplatesByResRef(objects), [objects]);
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

  useEffect(() => {
    if (forcedActiveType && activeType !== forcedActiveType) {
      setActiveType(forcedActiveType);
      return;
    }
    if (!allowedTypeSet.has(activeType)) {
      setActiveType(resolvedDefaultType);
    }
  }, [activeType, allowedTypeSet, forcedActiveType, resolvedDefaultType]);

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
  const itemCategoryCounts = useMemo(
    () =>
      ITEM_PALETTE_CATEGORIES.reduce<Record<ItemPaletteCategoryId, number>>(
        (counts, category) => {
          counts[category.id] =
            category.id === "all"
              ? sourceFilteredRows.length
              : sourceFilteredRows.filter(
                  (object) => object.kind === "items" && resolveItemPaletteCategory(object) === category.id
                ).length;
          return counts;
        },
        {
          all: 0,
          armor: 0,
          creature_items: 0,
          miscellaneous: 0,
          plot_item: 0,
          tutorial: 0,
          weapons: 0
        }
      ),
    [sourceFilteredRows]
  );
  const filteredRows = useMemo(() => {
    if (activeType !== "items" || activeItemCategory === "all") {
      return sourceFilteredRows;
    }
    return sourceFilteredRows.filter(
      (object) => object.kind === "items" && resolveItemPaletteCategory(object) === activeItemCategory
    );
  }, [activeItemCategory, activeType, sourceFilteredRows]);
  const activeTypeTotal = catalogViewModel.activeRows.length;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasUserActiveFilters =
    hasSearchQuery ||
    activeBlueprintSource !== "standard" ||
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

  return (
    <article
      className="sidebar-section scene-objects-section scene-object-add-panel"
      aria-label="add objects section"
    >
      <div className="scene-object-add-control-stack">
        <header className="scene-objects-header scene-object-add-panel-header">
          <h2>Add Objects</h2>
          <span
            className="scene-objects-total"
            title={hasNarrowedResults ? "Visible templates / active family templates" : "Visible templates"}
          >
            {addObjectResultLabel}
          </span>
        </header>
        <p className="scene-object-add-panel-note">Place templates onto area tiles.</p>

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
        <ul className="scene-object-list scene-object-add-list" aria-label={`${activeDefinition.label} add list`}>
          {filteredRows.map((object) => (
            <SceneObjectAddRow
              key={object.id}
              object={object}
              activeType={activeType}
              userId={userId}
              trackTelemetryEvent={trackTelemetryEvent}
              renderPayload={placeableRenderPayloadByTemplateId?.[object.id] ?? null}
              placeableAssetAccessToken={placeableAssetAccessToken}
              onObjectRenderPayloadNeeded={onObjectRenderPayloadNeeded}
              onObjectPreviewSelect={onObjectPreviewSelect}
              onObjectCreate={onObjectCreate}
              activeCreateObjectId={activeCreateObjectId}
            />
          ))}
        </ul>
      )}
    </article>
  );
}
