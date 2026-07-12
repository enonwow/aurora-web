import { useEffect, useMemo, useState } from "react";
import type { SceneObject } from "../contracts";
import type { PlaceableApiSubtype } from "../../placeables/contracts";
import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import { SceneObjectThumbnail } from "./SceneObjectThumbnail";

export type PlaceablesSubtypeFilter = "all" | PlaceableApiSubtype;

const PLACEABLES_SUBTYPE_FILTER_OPTIONS: Array<{
  value: PlaceablesSubtypeFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "generic", label: "Generic" },
  { value: "door", label: "Doors" },
  { value: "container", label: "Storage" },
  { value: "vfx", label: "VFX" },
  { value: "light_source", label: "Lights" },
  { value: "trigger_proxy", label: "Triggers" }
];
const PLACEABLES_MODE_VISIBLE_BATCH_SIZE = 250;

interface PlaceablesModePanelProps {
  objects: SceneObject[];
  total: number;
  activeObjectId: string | null;
  subtypeFilter: PlaceablesSubtypeFilter;
  searchQuery: string;
  onSubtypeFilterChange: (value: PlaceablesSubtypeFilter) => void;
  onSearchQueryChange: (value: string) => void;
  onResetFilters: () => void;
  onObjectClick: (object: SceneObject) => void;
  isLoading: boolean;
  loadErrorMessage: string | null;
  previewErrorMessage: string | null;
  placeableRenderPayloadByTemplateId?: Record<string, PlaceableViewportRenderPayload> | null;
  placeableAssetAccessToken?: string | null;
  onObjectRenderPayloadNeeded?: (object: SceneObject) => void;
  thumbnailRenderEnabled?: boolean;
}

function trimWorkspacePreviewLabel(label: string): string {
  return label.slice(0, 8).toUpperCase();
}

export function PlaceablesModePanel({
  objects,
  total,
  activeObjectId,
  subtypeFilter,
  searchQuery,
  onSubtypeFilterChange,
  onSearchQueryChange,
  onResetFilters,
  onObjectClick,
  isLoading,
  loadErrorMessage,
  previewErrorMessage,
  placeableRenderPayloadByTemplateId,
  placeableAssetAccessToken,
  onObjectRenderPayloadNeeded,
  thumbnailRenderEnabled = true
}: PlaceablesModePanelProps) {
  const [visibleLimit, setVisibleLimit] = useState(PLACEABLES_MODE_VISIBLE_BATCH_SIZE);
  const shouldShowEmpty = !isLoading && !loadErrorMessage && objects.length === 0;
  const hasActiveFilters = searchQuery.trim().length > 0 || subtypeFilter !== "all";
  const resultLabel = hasActiveFilters ? `${objects.length}/${total}` : String(objects.length);
  const visibleObjects = useMemo(
    () => objects.slice(0, visibleLimit),
    [objects, visibleLimit]
  );
  const hasMoreVisibleObjects = visibleObjects.length < objects.length;

  useEffect(() => {
    setVisibleLimit(PLACEABLES_MODE_VISIBLE_BATCH_SIZE);
  }, [searchQuery, subtypeFilter]);

  return (
    <article
      className="sidebar-section workspace-mode-panel placeables-mode-panel scene-objects-section scene-object-add-panel"
      aria-label="placeables mode section"
    >
      <header className="scene-objects-header scene-object-add-panel-header">
        <h2>Placeables</h2>
        <span
          className="scene-objects-total"
          title={hasActiveFilters ? "Filtered placeables / loaded placeables" : "Loaded placeables"}
        >
          {resultLabel}
        </span>
      </header>

      <div className="scene-objects-type-picker scene-objects-type-toggle-picker">
        <span>Type</span>
        <div className="scene-objects-type-toggle-group" role="group" aria-label="Placeable type filter">
          {PLACEABLES_SUBTYPE_FILTER_OPTIONS.map((option) => {
            const isActive = option.value === subtypeFilter;
            return (
              <button
                key={option.value}
                type="button"
                className={`scene-objects-type-toggle ${isActive ? "is-active" : ""}`}
                onClick={() => onSubtypeFilterChange(option.value)}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scene-objects-search">
        <input
          type="search"
          aria-label="Filter placeables"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Filter by id / resref"
        />
        {searchQuery ? (
          <button
            type="button"
            className="scene-objects-search-clear"
            aria-label="Clear placeables filter"
            title="Clear filter"
            onClick={() => onSearchQueryChange("")}
          >
            X
          </button>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <button
          type="button"
          className="scene-objects-filter-reset"
          aria-label="Reset placeables filters"
          onClick={onResetFilters}
        >
          Reset filters
        </button>
      ) : null}

      {isLoading ? (
        <p className="scene-objects-empty" role="status">
          Loading placeables from backend...
        </p>
      ) : null}
      {loadErrorMessage ? (
        <p className="scene-objects-empty" role="alert">
          {loadErrorMessage}
        </p>
      ) : null}
      {previewErrorMessage ? (
        <p className="scene-objects-empty" role="alert">
          {previewErrorMessage}
        </p>
      ) : null}

      {shouldShowEmpty ? (
        <p className="scene-objects-empty">No placeables available.</p>
      ) : (
        <>
          <ul className="scene-object-list scene-object-add-list" aria-label="placeables mode list">
            {visibleObjects.map((object) => {
              const isSelected = object.id === activeObjectId;
              const resourceLabel =
                object.id.trim().toLowerCase() === object.resRef.trim().toLowerCase()
                  ? object.resRef
                  : `${object.id} / ${object.resRef}`;
              return (
                <li key={object.id}>
                  <button
                    type="button"
                    className={`scene-object-row scene-object-add-row ${isSelected ? "is-selected" : ""}`}
                    aria-selected={isSelected}
                    onClick={() => onObjectClick(object)}
                  >
                    <SceneObjectThumbnail
                      object={object}
                      fallbackLabel={trimWorkspacePreviewLabel(object.tag)}
                      renderPayload={placeableRenderPayloadByTemplateId?.[object.id] ?? null}
                      placeableAssetAccessToken={placeableAssetAccessToken}
                      onRenderPayloadNeeded={onObjectRenderPayloadNeeded}
                      thumbnailRenderEnabled={thumbnailRenderEnabled}
                    />
                    <span className="scene-object-row-meta scene-object-add-row-meta">
                      <strong title={object.tag}>{object.tag}</strong>
                      <small title={resourceLabel}>{resourceLabel}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {hasMoreVisibleObjects ? (
            <button
              type="button"
              className="scene-objects-filter-reset"
              aria-label="Show more placeables"
              onClick={() =>
                setVisibleLimit((current) => current + PLACEABLES_MODE_VISIBLE_BATCH_SIZE)
              }
            >
              More
            </button>
          ) : null}
        </>
      )}
    </article>
  );
}
