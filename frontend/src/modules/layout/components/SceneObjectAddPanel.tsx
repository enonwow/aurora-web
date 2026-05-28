import { useEffect, useMemo, useState } from "react";
import type { SceneObject } from "../contracts";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import {
  type SceneObjectCatalogQueryFacade,
  type SceneObjectCatalogType
} from "../application/sceneObjectCatalogQueryFacade";
import {
  OBJECT_ADD_DRAG_MIME,
  setCurrentObjectAddDragPayload,
  serializeObjectAddPayload,
  type ObjectAddDragPayload
} from "./objectAddDragPayload";

interface SceneObjectAddPanelProps {
  userId: string;
  objects: SceneObject[];
  sceneObjectCatalogQueryFacade: SceneObjectCatalogQueryFacade;
  trackTelemetryEvent: (name: string, payload?: TelemetryPayload) => void;
  allowedCatalogTypes?: SceneObjectCatalogType[];
  defaultActiveType?: SceneObjectCatalogType;
  hideUnsupportedCatalogTypes?: boolean;
}

type ConcreteSceneObjectCatalogType = Exclude<SceneObjectCatalogType, "all">;

const KIND_BADGE: Record<SceneObject["kind"], string> = {
  placeables: "PLC",
  creatures: "CRT",
  doors: "DOR",
  items: "ITM",
  sounds: "SND"
};

const KIND_COLORS: Record<SceneObject["kind"], string> = {
  placeables: "#5f9cff",
  creatures: "#ff8e78",
  doors: "#ffc980",
  items: "#91e8a5",
  sounds: "#bba0ff"
};

function encodeSvg(value: string): string {
  return value
    .replace(/"/g, "'")
    .replace(/%/g, "%25")
    .replace(/#/g, "%23")
    .replace(/{/g, "%7B")
    .replace(/}/g, "%7D")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/\s+/g, " ");
}

function createPreviewDataUrl(kind: SceneObject["kind"], label: string): string {
  const tint = KIND_COLORS[kind];
  const badge = KIND_BADGE[kind];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <rect x="1" y="1" width="46" height="46" rx="8" fill="#0b1728" stroke="#34557d" stroke-width="2" />
      <rect x="4" y="4" width="40" height="18" rx="5" fill="${tint}" fill-opacity="0.35" />
      <text x="24" y="17" text-anchor="middle" font-family="Segoe UI" font-size="9" fill="#f0f6ff" font-weight="700">${badge}</text>
      <text x="24" y="34" text-anchor="middle" font-family="Segoe UI" font-size="8" fill="#c8d9ee">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeSvg(svg)}`;
}

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

export function SceneObjectAddPanel({
  userId,
  objects,
  sceneObjectCatalogQueryFacade,
  trackTelemetryEvent,
  allowedCatalogTypes,
  defaultActiveType,
  hideUnsupportedCatalogTypes = false
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
  const resolvedDefaultType = (() => {
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

  useEffect(() => {
    if (!allowedTypeSet.has(activeType)) {
      setActiveType(resolvedDefaultType);
    }
  }, [activeType, allowedTypeSet, resolvedDefaultType]);

  const catalogViewModel = useMemo(
    () =>
      sceneObjectCatalogQueryFacade.query({
        objects: templateObjects,
        activeType,
        searchQuery
      }),
    [activeType, templateObjects, sceneObjectCatalogQueryFacade, searchQuery]
  );

  const { groupedRows, filteredRows, activeDefinition } = catalogViewModel;

  return (
    <article
      className="sidebar-section scene-objects-section scene-object-add-panel"
      aria-label="add objects section"
    >
      <header className="scene-objects-header scene-object-add-panel-header">
        <h2>Add Objects</h2>
      </header>
      <p className="scene-object-add-panel-note">Drag selected template onto canvas.</p>

      <label className="scene-objects-type-picker">
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
            trackTelemetryEvent("ui.workspace.add_objects.type_changed", {
              userId,
              objectType: nextType,
              count,
              source: "selector"
            });
          }}
        >
          {(!hideUnsupportedCatalogTypes || baseViewModel.mvpTypes.some((entry) => entry.key !== "all" && allowedTypeSet.has(entry.key as ConcreteSceneObjectCatalogType))) && (
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
          {(!hideUnsupportedCatalogTypes || baseViewModel.postMvpTypes.some((entry) => allowedTypeSet.has(entry.key as ConcreteSceneObjectCatalogType))) && (
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

      <label className="scene-objects-search">
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
      </label>

      {filteredRows.length === 0 ? (
        <p className="scene-objects-empty">No {activeDefinition.label.toLowerCase()} objects available.</p>
      ) : (
        <ul className="scene-object-list scene-object-add-list" aria-label={`${activeDefinition.label} add list`}>
          {filteredRows.map((object) => (
            <li key={object.id}>
              <button
                type="button"
                draggable
                className="scene-object-row scene-object-add-row"
                onDragStart={(event) => {
                  const payload: ObjectAddDragPayload = {
                    id: object.id,
                    kind: object.kind,
                    tag: object.tag,
                    resRef: object.resRef,
                    name: object.name
                  };
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
                  setCurrentObjectAddDragPayload(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                  }
                }}
              >
                <img
                  src={createPreviewDataUrl(object.kind, trimTagForPreview(object.tag))}
                  width={48}
                  height={48}
                  loading="lazy"
                  alt={`${object.tag} 2D preview`}
                />
                <span className="scene-object-row-meta scene-object-add-row-meta">
                  <strong>{object.tag}</strong>
                  <small>{object.resRef}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
