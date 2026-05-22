import { useMemo, useState } from "react";
import type { SceneObject, SceneObjectKind } from "../../scene/contracts";
import { trackTelemetry } from "../../telemetry/telemetryStore";

interface SceneObjectListPanelProps {
  userId: string;
  objects: SceneObject[];
  onObjectSelect?: (object: SceneObject) => void;
  onObjectContextMenu?: (
    object: SceneObject,
    clientX: number,
    clientY: number
  ) => void;
}

type SceneObjectCatalogType =
  | "placeables"
  | "creatures"
  | "doors"
  | "items"
  | "sounds"
  | "vfx"
  | "encounters"
  | "triggers"
  | "waypoints"
  | "stores"
  | "ground_items";

interface SceneObjectCatalogDefinition {
  key: SceneObjectCatalogType;
  label: string;
  tier: "mvp" | "post_mvp";
}

const CATALOG_TYPES: SceneObjectCatalogDefinition[] = [
  {
    key: "placeables",
    label: "Placeables",
    tier: "mvp"
  },
  {
    key: "creatures",
    label: "Creatures",
    tier: "mvp"
  },
  {
    key: "doors",
    label: "Doors",
    tier: "mvp"
  },
  {
    key: "items",
    label: "Items",
    tier: "mvp"
  },
  {
    key: "sounds",
    label: "Sounds",
    tier: "mvp"
  },
  {
    key: "vfx",
    label: "VFX",
    tier: "post_mvp"
  },
  {
    key: "encounters",
    label: "Encounters",
    tier: "post_mvp"
  },
  {
    key: "triggers",
    label: "Triggers",
    tier: "post_mvp"
  },
  {
    key: "waypoints",
    label: "Waypoints",
    tier: "post_mvp"
  },
  {
    key: "stores",
    label: "Stores",
    tier: "post_mvp"
  },
  {
    key: "ground_items",
    label: "Ground Items",
    tier: "post_mvp"
  }
];

const SUPPORTED_KIND_SET = new Set<SceneObjectKind>([
  "placeables",
  "creatures",
  "doors",
  "items",
  "sounds"
]);

const KIND_BADGE: Record<SceneObjectKind, string> = {
  placeables: "PLC",
  creatures: "CRT",
  doors: "DOR",
  items: "ITM",
  sounds: "SND"
};

const KIND_COLORS: Record<SceneObjectKind, string> = {
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

function createPreviewDataUrl(kind: SceneObjectKind, label: string): string {
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

function normalizeKind(kind: SceneObjectKind): SceneObjectCatalogType {
  return SUPPORTED_KIND_SET.has(kind) ? kind : "vfx";
}

function trimTagForPreview(tag: string): string {
  return tag.slice(0, 8).toUpperCase();
}

export function SceneObjectListPanel({
  userId,
  objects,
  onObjectSelect,
  onObjectContextMenu
}: SceneObjectListPanelProps) {
  const [activeType, setActiveType] = useState<SceneObjectCatalogType>("placeables");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const rows: Record<SceneObjectCatalogType, SceneObject[]> = {
      placeables: [],
      creatures: [],
      doors: [],
      items: [],
      sounds: [],
      vfx: [],
      encounters: [],
      triggers: [],
      waypoints: [],
      stores: [],
      ground_items: []
    };

    objects.forEach((object) => {
      rows[normalizeKind(object.kind)].push(object);
    });

    return rows;
  }, [objects]);

  const activeRows = grouped[activeType] ?? [];
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    if (!normalizedQuery) {
      return activeRows;
    }
    return activeRows.filter((object) => {
      const tag = object.tag.toLowerCase();
      const resRef = object.resRef.toLowerCase();
      return tag.includes(normalizedQuery) || resRef.includes(normalizedQuery);
    });
  }, [activeRows, normalizedQuery]);

  const activeDefinition =
    CATALOG_TYPES.find((entry) => entry.key === activeType) ?? CATALOG_TYPES[0];
  const mvpTypes = CATALOG_TYPES.filter((entry) => entry.tier === "mvp");
  const postMvpTypes = CATALOG_TYPES.filter((entry) => entry.tier === "post_mvp");
  const totalCount = CATALOG_TYPES.reduce(
    (count, entry) => count + (grouped[entry.key]?.length ?? 0),
    0
  );

  return (
    <article className="sidebar-section scene-objects-section" aria-label="scene objects section">
      <header className="scene-objects-header">
        <h2>Scene Objects</h2>
        <span className="scene-objects-total">{totalCount}</span>
      </header>

      <label className="scene-objects-type-picker">
        <span>Type</span>
        <select
          aria-label="Object type selector"
          value={activeType}
          onChange={(event) => {
            const nextType = event.target.value as SceneObjectCatalogType;
            const count = grouped[nextType]?.length ?? 0;
            setActiveType(nextType);
            trackTelemetry("ui.workspace.scene_objects.type_changed", {
              userId,
              objectType: nextType,
              count,
              source: "selector"
            });
          }}
        >
          <optgroup label="MVP">
            {mvpTypes.map((entry) => {
              const count = grouped[entry.key]?.length ?? 0;
              return (
                <option value={entry.key} key={entry.key}>
                  {entry.label} ({count})
                </option>
              );
            })}
          </optgroup>
          <optgroup label="Post-MVP">
            {postMvpTypes.map((entry) => {
              const count = grouped[entry.key]?.length ?? 0;
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
            trackTelemetry("ui.workspace.scene_objects.filter_changed", {
              userId,
              objectType: activeType,
              query: nextValue
            });
          }}
          placeholder="Filter by tag / resref"
        />
      </label>

      {filteredRows.length === 0 ? (
        <p className="scene-objects-empty">
          No {activeDefinition.label.toLowerCase()} objects in current area.
        </p>
      ) : (
        <ul className="scene-object-list" aria-label={`${activeDefinition.label} list`}>
          {filteredRows.map((object) => (
            <li key={object.id}>
              <button
                type="button"
                className={`scene-object-row ${selectedObjectId === object.id ? "is-selected" : ""}`}
                aria-selected={selectedObjectId === object.id}
                onClick={() => {
                  setSelectedObjectId(object.id);
                  onObjectSelect?.(object);
                  trackTelemetry("ui.workspace.scene_objects.row_clicked", {
                    userId,
                    objectId: object.id,
                    objectKind: object.kind
                  });
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setSelectedObjectId(object.id);
                  onObjectContextMenu?.(object, event.clientX, event.clientY);
                  trackTelemetry("ui.workspace.scene_objects.row_context_menu", {
                    userId,
                    objectId: object.id,
                    objectKind: object.kind
                  });
                }}
              >
                <img
                  src={createPreviewDataUrl(object.kind, trimTagForPreview(object.tag))}
                  width={48}
                  height={48}
                  loading="lazy"
                  alt={`${object.tag} 2D preview`}
                />
                <span className="scene-object-row-meta">
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
