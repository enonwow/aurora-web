import type { SceneObject, SceneObjectKind } from "../contracts";

export type SceneObjectCatalogType =
  | "all"
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

export interface SceneObjectCatalogDefinition {
  key: SceneObjectCatalogType;
  label: string;
  tier: "mvp" | "post_mvp";
}

export interface SceneObjectCatalogQueryParams {
  objects: SceneObject[];
  activeType: SceneObjectCatalogType;
  searchQuery: string;
}

export interface SceneObjectCatalogQueryResult {
  groupedRows: Record<SceneObjectCatalogType, SceneObject[]>;
  activeRows: SceneObject[];
  filteredRows: SceneObject[];
  allowedObjectIds: string[];
  activeDefinition: SceneObjectCatalogDefinition;
  mvpTypes: SceneObjectCatalogDefinition[];
  postMvpTypes: SceneObjectCatalogDefinition[];
  totalCount: number;
}

export interface SceneObjectCatalogQueryFacade {
  query(params: SceneObjectCatalogQueryParams): SceneObjectCatalogQueryResult;
}

const CATALOG_DEFINITIONS: SceneObjectCatalogDefinition[] = [
  { key: "all", label: "All", tier: "mvp" },
  { key: "placeables", label: "Placeables", tier: "mvp" },
  { key: "creatures", label: "Creatures", tier: "mvp" },
  { key: "doors", label: "Doors", tier: "mvp" },
  { key: "items", label: "Items", tier: "mvp" },
  { key: "sounds", label: "Sounds", tier: "mvp" },
  { key: "vfx", label: "VFX", tier: "post_mvp" },
  { key: "encounters", label: "Encounters", tier: "post_mvp" },
  { key: "triggers", label: "Triggers", tier: "post_mvp" },
  { key: "waypoints", label: "Waypoints", tier: "post_mvp" },
  { key: "stores", label: "Stores", tier: "post_mvp" },
  { key: "ground_items", label: "Ground Items", tier: "post_mvp" }
];

const SUPPORTED_KIND_SET = new Set<SceneObjectKind>([
  "placeables",
  "creatures",
  "doors",
  "encounters",
  "items",
  "sounds",
  "stores",
  "triggers",
  "waypoints"
]);

function createEmptyRows(): Record<SceneObjectCatalogType, SceneObject[]> {
  return {
    all: [],
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
}

function normalizeKind(kind: SceneObjectKind): SceneObjectCatalogType {
  return SUPPORTED_KIND_SET.has(kind) ? kind : "vfx";
}

function resolveActiveType(activeType: SceneObjectCatalogType): SceneObjectCatalogType {
  if (CATALOG_DEFINITIONS.some((definition) => definition.key === activeType)) {
    return activeType;
  }
  return "all";
}

function filterRows(rows: SceneObject[], searchQuery: string): SceneObject[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((object) => {
    const fields = [
      object.name,
      object.tag,
      object.resRef,
      object.source?.sourceObjectId,
      object.source?.sourceKind,
      object.source?.templateId,
      object.source?.sourceModelResRef,
      object.source?.localizedName,
      object.source?.description,
      object.creatureProperties?.firstName,
      object.creatureProperties?.lastName,
      object.creatureProperties?.race,
      object.creatureProperties?.appearance,
      object.creatureProperties?.appearanceProfile?.raceModel,
      object.creatureProperties?.lookupProfile?.soundSetResRef,
      object.itemProperties?.localizedName,
      object.itemProperties?.baseItemLabel,
      object.itemProperties?.baseItemItemClass,
      object.itemProperties?.baseItemModelType,
      object.itemProperties?.baseItemDefaultModel,
      object.itemProperties?.baseItemDefaultIcon,
      object.itemProperties?.modelPartResRefs?.join(" "),
      object.itemProperties?.cloakModelResRef,
      object.itemProperties?.cloakTextureResRef,
      object.itemProperties?.cloakIconResRef
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => value.toLowerCase());
    return fields.some((value) => value.includes(normalizedQuery));
  });
}

export function createSceneObjectCatalogQueryFacade(): SceneObjectCatalogQueryFacade {
  return {
    query({ objects, activeType, searchQuery }) {
      const groupedRows = createEmptyRows();
      objects.forEach((object) => {
        groupedRows.all.push(object);
        groupedRows[normalizeKind(object.kind)].push(object);
      });

      const resolvedActiveType = resolveActiveType(activeType);
      const activeRows = groupedRows[resolvedActiveType] ?? groupedRows.all;
      const filteredRows = filterRows(activeRows, searchQuery);

      return {
        groupedRows,
        activeRows,
        filteredRows,
        allowedObjectIds: activeRows.map((object) => object.id),
        activeDefinition:
          CATALOG_DEFINITIONS.find((entry) => entry.key === resolvedActiveType) ??
          CATALOG_DEFINITIONS[0],
        mvpTypes: CATALOG_DEFINITIONS.filter((entry) => entry.tier === "mvp"),
        postMvpTypes: CATALOG_DEFINITIONS.filter((entry) => entry.tier === "post_mvp"),
        totalCount: objects.length
      };
    }
  };
}
