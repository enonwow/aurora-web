import { useMemo, useState } from "react";
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
  trackTelemetryEvent
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

  const selectableMvpTypes = useMemo(
    () => toConcreteTypes(baseViewModel.mvpTypes.map((entry) => entry.key)),
    [baseViewModel.mvpTypes]
  );
  const selectablePostMvpTypes = useMemo(
    () => toConcreteTypes(baseViewModel.postMvpTypes.map((entry) => entry.key)),
    [baseViewModel.postMvpTypes]
  );
  const fallbackType = selectablePostMvpTypes[0] ?? "placeables";
  const defaultType = selectableMvpTypes[0] ?? fallbackType;

  const [activeType, setActiveType] = useState<ConcreteSceneObjectCatalogType>(defaultType);
  const [searchQuery, setSearchQuery] = useState("");

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
          <optgroup label="MVP">
            {baseViewModel.mvpTypes
              .filter((entry) => entry.key !== "all")
              .map((entry) => {
                const count = groupedRows[entry.key]?.length ?? 0;
                return (
                  <option value={entry.key} key={entry.key}>
                    {entry.label} ({count})
                  </option>
                );
              })}
          </optgroup>
          <optgroup label="Post-MVP">
            {baseViewModel.postMvpTypes.map((entry) => {
              const count = groupedRows[entry.key]?.length ?? 0;
              return (
                <option value={entry.key} key={entry.key}>
                  {entry.label} ({count})
                </option>
              );
            })}
          </optgroup>
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
