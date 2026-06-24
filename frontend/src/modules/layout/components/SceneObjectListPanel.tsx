import { useEffect, useMemo, useState } from "react";
import type { SceneObject } from "../contracts";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import {
  type SceneObjectCatalogQueryFacade,
  type SceneObjectCatalogType
} from "../application/sceneObjectCatalogQueryFacade";
import { SceneObjectThumbnail } from "./SceneObjectThumbnail";

interface SceneObjectListPanelProps {
  userId: string;
  objects: SceneObject[];
  sceneObjectCatalogQueryFacade: SceneObjectCatalogQueryFacade;
  trackTelemetryEvent: (name: string, payload: TelemetryPayload) => void;
  allowedCatalogTypes?: SceneObjectCatalogType[];
  defaultActiveType?: SceneObjectCatalogType;
  hideUnsupportedCatalogTypes?: boolean;
  selectedObjectIds?: string[];
  placeableRenderPayloadByObjectId?: Record<string, PlaceableViewportRenderPayload> | null;
  placeableAssetAccessToken?: string | null;
  onObjectRenderPayloadNeeded?: (object: SceneObject) => void;
  onCatalogScopeChange?: (scope: {
    sourceType: SceneObjectCatalogType;
    allowedObjectIds: string[];
  }) => void;
  onObjectSelect?: (
    object: SceneObject,
    options?: {
      additive: boolean;
      sourceType: SceneObjectCatalogType;
      allowedObjectIds: string[];
    }
  ) => void;
  onObjectContextMenu?: (
    object: SceneObject,
    clientX: number,
    clientY: number
  ) => void;
  onObjectPropertiesOpen?: (object: SceneObject) => void;
}

export type { SceneObjectCatalogType };

function trimTagForPreview(tag: string): string {
  return tag.slice(0, 8).toUpperCase();
}

function resolveSourceStatus(object: SceneObject): "source-backed" | "fallback" {
  return object.source?.type === "aurora_git" ? "source-backed" : "fallback";
}

function formatCoordinate(value: number): string {
  if (!Number.isFinite(value)) {
    return "0.0";
  }
  return value.toFixed(1);
}

function formatBearing(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return String(Math.round(value));
}

function formatOrderIndex(index: number): string {
  return String(Math.max(0, index) + 1).padStart(3, "0");
}

function resolveObjectOrderKey(object: SceneObject, objectIndex: number | undefined): string {
  const orderIndex = objectIndex ?? 0;
  const prefix = object.source?.type === "aurora_git" ? "GIT" : "scene";
  return `${prefix} #${formatOrderIndex(orderIndex)}`;
}

function resolveObjectSourceSummary(object: SceneObject): string {
  if (object.source?.type === "aurora_git") {
    const sourceId = object.source.sourceObjectId ?? object.id;
    return [
      `GIT ${sourceId}`,
      `${formatCoordinate(object.x)}, ${formatCoordinate(object.y)}, z ${formatCoordinate(object.z)}`,
      `${formatBearing(object.bearing)} deg`
    ].join(" | ");
  }
  return [
    "local",
    `${formatCoordinate(object.x)}, ${formatCoordinate(object.y)}, z ${formatCoordinate(object.z)}`,
    `${formatBearing(object.bearing)} deg`
  ].join(" | ");
}

function buildSourceStatusSummary(objects: SceneObject[]): {
  gitCount: number;
  fallbackCount: number;
  placeableCount: number;
  doorCount: number;
} {
  return objects.reduce(
    (summary, object) => {
      if (object.source?.type === "aurora_git") {
        summary.gitCount += 1;
      } else {
        summary.fallbackCount += 1;
      }
      if (object.kind === "placeables") {
        summary.placeableCount += 1;
      }
      if (object.kind === "doors") {
        summary.doorCount += 1;
      }
      return summary;
    },
    {
      gitCount: 0,
      fallbackCount: 0,
      placeableCount: 0,
      doorCount: 0
    }
  );
}

export function SceneObjectListPanel({
  userId,
  objects,
  sceneObjectCatalogQueryFacade,
  trackTelemetryEvent,
  allowedCatalogTypes,
  defaultActiveType = "all",
  hideUnsupportedCatalogTypes = false,
  selectedObjectIds = [],
  placeableRenderPayloadByObjectId,
  placeableAssetAccessToken,
  onObjectRenderPayloadNeeded,
  onCatalogScopeChange,
  onObjectSelect,
  onObjectContextMenu,
  onObjectPropertiesOpen
}: SceneObjectListPanelProps) {
  const baselineViewModel = useMemo(
    () =>
      sceneObjectCatalogQueryFacade.query({
        objects,
        activeType: "all",
        searchQuery: ""
      }),
    [objects, sceneObjectCatalogQueryFacade]
  );
  const allCatalogTypes = useMemo(
    () => [...baselineViewModel.mvpTypes, ...baselineViewModel.postMvpTypes].map((entry) => entry.key),
    [baselineViewModel.mvpTypes, baselineViewModel.postMvpTypes]
  );
  const allowedTypeSet = useMemo(() => {
    if (!allowedCatalogTypes || allowedCatalogTypes.length === 0) {
      return new Set<SceneObjectCatalogType>(allCatalogTypes);
    }
    const filtered = allowedCatalogTypes.filter((type) => allCatalogTypes.includes(type));
    return new Set<SceneObjectCatalogType>(filtered.length > 0 ? filtered : allCatalogTypes);
  }, [allCatalogTypes, allowedCatalogTypes]);
  const resolvedDefaultType = allowedTypeSet.has(defaultActiveType)
    ? defaultActiveType
    : allCatalogTypes.find((type) => allowedTypeSet.has(type)) ?? "all";
  const [activeType, setActiveType] = useState<SceneObjectCatalogType>(resolvedDefaultType);
  const [searchQuery, setSearchQuery] = useState("");
  const catalogViewModel = useMemo(
    () =>
      sceneObjectCatalogQueryFacade.query({
        objects,
        activeType,
        searchQuery
      }),
    [activeType, objects, sceneObjectCatalogQueryFacade, searchQuery]
  );
  const {
    groupedRows,
    filteredRows,
    allowedObjectIds,
    activeDefinition,
    mvpTypes,
    postMvpTypes,
    totalCount
  } = catalogViewModel;
  const visibleRowIdSet = useMemo(
    () => new Set(filteredRows.map((object) => object.id)),
    [filteredRows]
  );
  const selectedSet = useMemo(
    () => new Set(selectedObjectIds.filter((id) => visibleRowIdSet.has(id))),
    [selectedObjectIds, visibleRowIdSet]
  );
  const objectOrderIndexById = useMemo(
    () => new Map(objects.map((object, index) => [object.id, index])),
    [objects]
  );
  const sourceStatusSummary = useMemo(() => buildSourceStatusSummary(objects), [objects]);
  const emptyMessage =
    activeDefinition.key === "all"
      ? "No objects in current area."
      : `No ${activeDefinition.label.toLowerCase()} objects in current area.`;

  useEffect(() => {
    if (!allowedTypeSet.has(activeType)) {
      setActiveType(resolvedDefaultType);
    }
  }, [activeType, allowedTypeSet, resolvedDefaultType]);

  useEffect(() => {
    onCatalogScopeChange?.({
      sourceType: activeType,
      allowedObjectIds
    });
  }, [activeType, allowedObjectIds, onCatalogScopeChange]);

  return (
    <article className="sidebar-section scene-objects-section" aria-label="scene objects section">
      <header className="scene-objects-header">
        <h2>Scene Objects</h2>
        <span className="scene-objects-total">{totalCount}</span>
      </header>

      <div className="scene-objects-source-summary" aria-label="object source summary">
        <span className="scene-objects-source-chip is-source-backed">
          GIT {sourceStatusSummary.gitCount}
        </span>
        <span className="scene-objects-source-chip">
          PLC {sourceStatusSummary.placeableCount}
        </span>
        <span className="scene-objects-source-chip">
          DOR {sourceStatusSummary.doorCount}
        </span>
        {sourceStatusSummary.fallbackCount > 0 ? (
          <span className="scene-objects-source-chip is-fallback">
            fallback {sourceStatusSummary.fallbackCount}
          </span>
        ) : null}
      </div>

      <label className="scene-objects-type-picker">
        <span>Type</span>
        <select
          aria-label="Object type selector"
          value={activeType}
          onChange={(event) => {
            const nextType = event.target.value as SceneObjectCatalogType;
            if (!allowedTypeSet.has(nextType)) {
              return;
            }
            const count = groupedRows[nextType]?.length ?? 0;
            setActiveType(nextType);
            trackTelemetryEvent("ui.workspace.scene_objects.type_changed", {
              userId,
              objectType: nextType,
              count,
              source: "selector"
            });
          }}
        >
          {(!hideUnsupportedCatalogTypes || mvpTypes.some((entry) => allowedTypeSet.has(entry.key))) && (
            <optgroup label="MVP">
              {mvpTypes.map((entry) => {
                const allowed = allowedTypeSet.has(entry.key);
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
          {(!hideUnsupportedCatalogTypes || postMvpTypes.some((entry) => allowedTypeSet.has(entry.key))) && (
            <optgroup label="Post-MVP">
              {postMvpTypes.map((entry) => {
                const allowed = allowedTypeSet.has(entry.key);
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

      <label className="scene-objects-search">
        <input
          type="search"
          aria-label="Filter objects"
          value={searchQuery}
          onChange={(event) => {
            const nextValue = event.target.value;
            setSearchQuery(nextValue);
            trackTelemetryEvent("ui.workspace.scene_objects.filter_changed", {
              userId,
              objectType: activeType,
              query: nextValue
            });
          }}
          placeholder="Filter by tag / resref"
        />
      </label>

      {filteredRows.length === 0 ? (
        <p className="scene-objects-empty">{emptyMessage}</p>
      ) : (
        <ul className="scene-object-list" aria-label={`${activeDefinition.label} list`}>
          {filteredRows.map((object) => {
            const supportsProperties =
              object.kind === "placeables" ||
              object.kind === "sounds" ||
              object.kind === "doors" ||
              object.kind === "creatures";
            const sourceSummary = resolveObjectSourceSummary(object);
            const sourceStatus = resolveSourceStatus(object);
            const orderKey = resolveObjectOrderKey(object, objectOrderIndexById.get(object.id));
            return (
            <li
              key={object.id}
              className="scene-object-list-item"
              data-object-kind={object.kind}
              data-source-status={sourceStatus}
              data-source-order-key={orderKey}
            >
              <button
                type="button"
                className={`scene-object-row scene-object-row-${sourceStatus} ${selectedSet.has(object.id) ? "is-selected" : ""}`}
                aria-selected={selectedSet.has(object.id)}
                title={`${orderKey} / ${object.tag} / ${object.resRef} / ${sourceSummary}`}
                onClick={(event) => {
                  const additive = event.ctrlKey || event.metaKey;
                  onObjectSelect?.(object, {
                    additive,
                    sourceType: activeType,
                    allowedObjectIds
                  });
                  trackTelemetryEvent("ui.workspace.scene_objects.row_clicked", {
                    userId,
                    objectId: object.id,
                    objectKind: object.kind,
                    additive
                  });
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onObjectContextMenu?.(object, event.clientX, event.clientY);
                  trackTelemetryEvent("ui.workspace.scene_objects.row_context_menu", {
                    userId,
                    objectId: object.id,
                    objectKind: object.kind
                  });
                }}
              >
                <SceneObjectThumbnail
                  object={object}
                  fallbackLabel={trimTagForPreview(object.tag)}
                  renderPayload={placeableRenderPayloadByObjectId?.[object.id] ?? null}
                  placeableAssetAccessToken={placeableAssetAccessToken}
                  onRenderPayloadNeeded={onObjectRenderPayloadNeeded}
                />
                <span className="scene-object-row-meta">
                  <span className="scene-object-row-title">
                    <strong>{object.tag}</strong>
                    <span className="scene-object-order-key">{orderKey}</span>
                    <span className={`scene-object-source-status scene-object-source-status-${sourceStatus}`}>
                      {sourceStatus === "source-backed" ? "GIT" : "fallback"}
                    </span>
                  </span>
                  <small>{object.resRef}</small>
                  <small className="scene-object-row-source">{sourceSummary}</small>
                </span>
              </button>
              {supportsProperties ? (
                <button
                  type="button"
                  className="scene-object-row-action"
                  aria-label="Open object properties"
                  title={`Open properties for ${object.tag}`}
                  onClick={() => {
                    onObjectPropertiesOpen?.(object);
                    trackTelemetryEvent("ui.workspace.scene_objects.properties_opened", {
                      userId,
                      objectId: object.id,
                      objectKind: object.kind,
                      source: "scene_object_list"
                    });
                  }}
                >
                  Properties
                </button>
              ) : null}
            </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
