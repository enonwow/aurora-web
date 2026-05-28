import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AreaScene, SceneObject, SceneObjectKind } from "../contracts";
import type {
  WorkspaceChromeFacade,
  WorkspaceCommandSignal,
  WorkspaceUserRole,
  WorkspaceToolbarState
} from "../application/workspaceChromeFacade";
import type { SceneObjectCatalogQueryFacade } from "../application/sceneObjectCatalogQueryFacade";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import { SceneObjectAddPanel } from "./SceneObjectAddPanel";
import { SceneObjectListPanel } from "./SceneObjectListPanel";
import type { SceneObjectCatalogType } from "./SceneObjectListPanel";
import { WorkspaceCanvasViewport } from "./WorkspaceCanvasViewport";
import type { WorkspaceOptionSettings } from "../application/layoutPreferencesFacade";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import { AreaSelectionPanel } from "./AreaSelectionPanel";
import type { AreaApiPort } from "../../areas/ports/areaApiPort";
import type { PlaceableApiPort } from "../../placeables/ports/placeableApiPort";
import { mapPlaceablePreviewToScene } from "../../placeables/application/placeablePreviewSceneMapper";
import {
  getDefaultWorkspaceModeId,
  listWorkspaceModes,
  resolveWorkspaceMode,
  type WorkspaceModeDefinition,
  type WorkspaceModeId
} from "../workspaceModes";

interface WorkspaceMockLayoutProps {
  role: WorkspaceUserRole;
  userId: string;
  workspaceChromeFacade: WorkspaceChromeFacade;
  sceneViewportPort: SceneViewportPort;
  areaApiPort: AreaApiPort;
  placeableApiPort?: PlaceableApiPort;
  backendAccessToken: string | null;
  sceneObjectCatalogQueryFacade: SceneObjectCatalogQueryFacade;
  trackTelemetryEvent: (name: string, payload?: TelemetryPayload) => void;
  toolbarState: WorkspaceToolbarState;
  commandSignal: WorkspaceCommandSignal | null;
  workspaceOptions: WorkspaceOptionSettings;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  onToggleLeftCollapsed: () => void;
  onToggleRightCollapsed: () => void;
}

const SIDEBAR_EXPANDED_WIDTH_PX = 320;
const SIDEBAR_COLLAPSED_WIDTH_PX = 44;

interface SidebarSelectSignal {
  revision: number;
  objectId: string;
  additive: boolean;
  sourceType: SceneObjectCatalogType;
  allowedObjectIds: string[];
}

interface SidebarContextMenuSignal {
  revision: number;
  objectId: string;
  objectKind: SceneObjectKind;
  clientX: number;
  clientY: number;
}

interface SceneObjectCatalogScope {
  sourceType: SceneObjectCatalogType;
  allowedObjectIds: string[];
}

const DEFAULT_VISUAL_TRANSFORM = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  pitch: 0,
  roll: 0,
  yaw: 0
} as const;

const SCENE_KIND_TO_CATALOG_TYPE: Record<SceneObjectKind, SceneObjectCatalogType> = {
  placeables: "placeables",
  creatures: "creatures",
  doors: "doors",
  items: "items",
  sounds: "sounds"
};

function filterObjectsForWorkspaceMode(
  objects: SceneObject[],
  mode: WorkspaceModeDefinition
): SceneObject[] {
  const allowedTypes = new Set(mode.allowedCatalogTypes);
  if (allowedTypes.has("all")) {
    return objects;
  }
  return objects.filter((object) => allowedTypes.has(SCENE_KIND_TO_CATALOG_TYPE[object.kind]));
}

function buildPreviewSceneFromObject(object: SceneObject, now = () => Date.now()): AreaScene {
  return mapPlaceablePreviewToScene(
    {
      templateId: object.id,
      resref: object.resRef,
      name: object.name ?? object.tag,
      tag: object.tag,
      kind: "placeables",
      x: 0.5,
      y: 0.5,
      z: 0,
      bearing: object.bearing
    },
    {
      now,
      width: 1,
      height: 1
    }
  );
}

function filterPlaceablesByQuery(objects: SceneObject[], query: string): SceneObject[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return objects;
  }
  return objects.filter((object) => {
    const normalizedTag = object.tag.toLowerCase();
    const normalizedResRef = object.resRef.toLowerCase();
    return (
      normalizedTag.includes(normalizedQuery) || normalizedResRef.includes(normalizedQuery)
    );
  });
}

function dedupePlaceableTemplates(objects: SceneObject[]): SceneObject[] {
  const uniqueByTemplateId = new Map<string, SceneObject>();
  objects.forEach((object) => {
    const normalizedTemplateId = object.id.trim().toLowerCase();
    if (!uniqueByTemplateId.has(normalizedTemplateId)) {
      uniqueByTemplateId.set(normalizedTemplateId, object);
    }
  });
  return Array.from(uniqueByTemplateId.values());
}

function mapPlaceableListItemToSceneObject(
  item: {
    templateId: string;
    resref: string;
    name: string;
    category: string;
  },
  index: number
): SceneObject {
  const fallbackTag = item.resref.trim().length > 0 ? item.resref : item.templateId;
  const normalizedName = item.name.trim().length > 0 ? item.name : `${item.category} ${String(index + 1).padStart(3, "0")}`;
  const normalizedTagSource = normalizedName.trim().length > 0 ? normalizedName : fallbackTag;
  return {
    id: item.templateId,
    kind: "placeables",
    name: normalizedName,
    resRef: item.resref,
    tag: normalizedTagSource.toUpperCase(),
    isStatic: true,
    x: 0.5,
    y: 0.5,
    z: 0,
    bearing: 0,
    visualTransform: { ...DEFAULT_VISUAL_TRANSFORM },
    placeableProperties: {
      plot: false,
      useable: false,
      hasInventory: false
    }
  };
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function BuilderModeSwitch({
  activeModeId,
  onModeSelect
}: {
  activeModeId: WorkspaceModeId;
  onModeSelect: (modeId: WorkspaceModeId) => void;
}) {
  const modes = listWorkspaceModes();
  return (
    <article className="sidebar-section workspace-mode-switch" aria-label="workspace mode switch">
      <header className="workspace-mode-switch-header">
        <h2>Workspace Mode</h2>
      </header>
      <div className="workspace-mode-switch-buttons" role="group" aria-label="workspace mode selector">
        {modes.map((mode) => {
          const isActive = mode.id === activeModeId;
          return (
            <button
              key={mode.id}
              type="button"
              className={`workspace-mode-switch-button ${isActive ? "is-active" : ""}`}
              onClick={() => onModeSelect(mode.id)}
              aria-pressed={isActive}
              title={mode.description}
            >
              <strong>{mode.label}</strong>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function PlaceablesModePanel({
  objects,
  activeObjectId,
  searchQuery,
  onSearchQueryChange,
  onObjectClick,
  isLoading,
  loadErrorMessage,
  previewErrorMessage
}: {
  objects: SceneObject[];
  activeObjectId: string | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onObjectClick: (objectId: string) => void;
  isLoading: boolean;
  loadErrorMessage: string | null;
  previewErrorMessage: string | null;
}) {
  const shouldShowEmpty = !isLoading && !loadErrorMessage && objects.length === 0;
  return (
    <article
      className="sidebar-section scene-objects-section scene-object-add-panel"
      aria-label="placeables mode section"
    >
      <header className="scene-objects-header scene-object-add-panel-header">
        <h2>Placeables</h2>
        <span className="scene-objects-total">{objects.length}</span>
      </header>

      <label className="scene-objects-search">
        <input
          type="search"
          aria-label="Filter placeables"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Filter by tag / resref"
        />
      </label>

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
        <ul className="scene-object-list scene-object-add-list" aria-label="placeables mode list">
          {objects.map((object) => {
            const isSelected = object.id === activeObjectId;
            return (
              <li key={object.id}>
                <button
                  type="button"
                  className={`scene-object-row scene-object-add-row ${isSelected ? "is-selected" : ""}`}
                  aria-selected={isSelected}
                  onClick={() => onObjectClick(object.id)}
                >
                  <span className="scene-object-row-meta scene-object-add-row-meta">
                    <strong>{object.tag}</strong>
                    <small>{object.resRef}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function SidebarColumn({
  side,
  title,
  sections,
  customContent,
  collapsed,
  onToggle
}: {
  side: "left" | "right";
  title: string;
  sections: { key: string; title: string; items: string[] }[];
  customContent?: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const toggleLabel = `Collapse ${side} panel`;
  const panelTitle = side === "left" ? "Tools panel" : "Inspector panel";
  const sidebarClassName = `workspace-sidebar workspace-sidebar-${side} ${collapsed ? "is-collapsed" : ""}`;
  const titleClassName = `workspace-sidebar-title ${collapsed ? "workspace-sidebar-title-collapsed" : ""}`;
  const buttonIcon = side === "left" ? "<" : ">";
  const collapsedAriaLabel = `Expand ${side} panel`;

  return (
    <aside
      className={sidebarClassName}
      aria-label={title}
      role={collapsed ? "button" : undefined}
      aria-expanded={collapsed ? false : undefined}
      tabIndex={collapsed ? 0 : undefined}
      onClick={collapsed ? onToggle : undefined}
      onKeyDown={
        collapsed
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggle();
              }
            }
          : undefined
      }
      title={collapsed ? collapsedAriaLabel : undefined}
    >
      <header className="workspace-sidebar-header">
        {side === "left" ? (
          <>
            <p className={titleClassName}>{panelTitle}</p>
            {!collapsed ? (
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={onToggle}
                aria-label={toggleLabel}
                title={toggleLabel}
              >
                {buttonIcon}
              </button>
            ) : null}
          </>
        ) : (
          <>
            {!collapsed ? (
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={onToggle}
                aria-label={toggleLabel}
                title={toggleLabel}
              >
                {buttonIcon}
              </button>
            ) : null}
            <p className={titleClassName}>{panelTitle}</p>
          </>
        )}
      </header>

      {collapsed ? null : (
        <div className="workspace-sidebar-content">
          {customContent}
          {sections.map((section) => (
            <article className="sidebar-section" key={section.key}>
              <h2>{section.title}</h2>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}

export function WorkspaceMockLayout({
  role,
  userId,
  workspaceChromeFacade,
  sceneViewportPort,
  areaApiPort,
  placeableApiPort,
  backendAccessToken,
  sceneObjectCatalogQueryFacade,
  trackTelemetryEvent,
  toolbarState,
  commandSignal,
  workspaceOptions,
  leftCollapsed,
  rightCollapsed,
  onToggleLeftCollapsed,
  onToggleRightCollapsed
}: WorkspaceMockLayoutProps) {
  const panels = workspaceChromeFacade.getRoleWorkspacePanels(role);
  const [activeBuilderModeId, setActiveBuilderModeId] = useState<WorkspaceModeId>(
    getDefaultWorkspaceModeId()
  );
  const activeBuilderMode = useMemo(
    () => resolveWorkspaceMode(activeBuilderModeId),
    [activeBuilderModeId]
  );
  const [sceneObjectsSnapshot, setSceneObjectsSnapshot] = useState<SceneObject[]>(
    () => sceneViewportPort.createInitialHistory(userId).present.objects
  );
  const modeScopedObjects = useMemo(
    () => filterObjectsForWorkspaceMode(sceneObjectsSnapshot, activeBuilderMode),
    [activeBuilderMode, sceneObjectsSnapshot]
  );
  const modeScopedObjectIds = useMemo(
    () => modeScopedObjects.map((object) => object.id),
    [modeScopedObjects]
  );
  const [selectedObjectIdsSnapshot, setSelectedObjectIdsSnapshot] = useState<string[]>([]);
  const [sidebarSelectSignal, setSidebarSelectSignal] = useState<SidebarSelectSignal | null>(
    null
  );
  const [sidebarContextMenuSignal, setSidebarContextMenuSignal] =
    useState<SidebarContextMenuSignal | null>(null);
  const [sceneObjectCatalogScope, setSceneObjectCatalogScope] =
    useState<SceneObjectCatalogScope>({
      sourceType: "all",
      allowedObjectIds: sceneObjectsSnapshot.map((object) => object.id)
    });
  const [placeablesCatalogObjects, setPlaceablesCatalogObjects] = useState<SceneObject[]>([]);
  const [placeablesCatalogStatus, setPlaceablesCatalogStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [placeablesCatalogError, setPlaceablesCatalogError] = useState<string | null>(null);
  const [placeablesPreviewError, setPlaceablesPreviewError] = useState<string | null>(null);
  const [activePlaceablesPreviewObjectId, setActivePlaceablesPreviewObjectId] = useState<
    string | null
  >(null);
  const [placeablesSearchQuery, setPlaceablesSearchQuery] = useState("");
  const [areaSceneSeed, setAreaSceneSeed] = useState<AreaScene | null>(null);
  const [placeablesModeSceneSeed, setPlaceablesModeSceneSeed] = useState<AreaScene | null>(null);
  const sidebarSignalRevisionRef = useRef(0);
  const leftPanelWidthPx = leftCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH_PX
    : SIDEBAR_EXPANDED_WIDTH_PX;
  const rightPanelWidthPx = rightCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH_PX
    : SIDEBAR_EXPANDED_WIDTH_PX;

  const isBuilder = role === "builder";
  const shouldRenderSceneObjectsPanel = isBuilder && activeBuilderMode.showSceneObjectListPanel;
  const shouldRenderSceneObjectAddPanel = isBuilder && activeBuilderMode.showSceneObjectAddPanel;
  const shouldRenderAreaSelectionPanel =
    isBuilder && activeBuilderMode.showAreaSelectionPanel;
  const isPlaceablesMode = isBuilder && activeBuilderMode.id === "placeables_mode";
  const placeablesModeObjects = useMemo(() => placeablesCatalogObjects, [placeablesCatalogObjects]);
  const filteredPlaceablesModeObjects = useMemo(
    () => filterPlaceablesByQuery(placeablesModeObjects, placeablesSearchQuery),
    [placeablesModeObjects, placeablesSearchQuery]
  );
  const renderObjectIds =
    isPlaceablesMode
      ? placeablesModeSceneSeed?.objects[0]?.id
        ? [placeablesModeSceneSeed.objects[0].id]
        : ["__placeables_mode_render_none__"]
      : null;
  const externalSceneSeed = isPlaceablesMode ? placeablesModeSceneSeed : areaSceneSeed;

  useEffect(() => {
    if (!isBuilder) {
      return;
    }
    setSceneObjectCatalogScope((current) => {
      if (
        current.sourceType === activeBuilderMode.defaultListType &&
        areStringArraysEqual(current.allowedObjectIds, modeScopedObjectIds)
      ) {
        return current;
      }
      return {
        sourceType: activeBuilderMode.defaultListType,
        allowedObjectIds: modeScopedObjectIds
      };
    });
  }, [activeBuilderMode.defaultListType, isBuilder, modeScopedObjectIds]);

  useEffect(() => {
    if (!isPlaceablesMode) {
      return;
    }
    if (!placeableApiPort || !backendAccessToken) {
      setPlaceablesCatalogObjects([]);
      setActivePlaceablesPreviewObjectId(null);
      setPlaceablesModeSceneSeed(null);
      setPlaceablesCatalogStatus("error");
      setPlaceablesCatalogError("Backend placeables catalog is unavailable.");
      setPlaceablesPreviewError(null);
      return;
    }

    let cancelled = false;
    setPlaceablesCatalogStatus("loading");
    setPlaceablesCatalogObjects([]);
    setActivePlaceablesPreviewObjectId(null);
    setPlaceablesModeSceneSeed(null);
    setPlaceablesCatalogError(null);
    setPlaceablesPreviewError(null);

    const fetchAllPages = async () => {
      const pageSize = 100;
      let offset = 0;
      const aggregated: Array<{
        templateId: string;
        resref: string;
        name: string;
        category: string;
      }> = [];

      while (true) {
        const result = await placeableApiPort.listPlaceables(backendAccessToken, {
          limit: pageSize,
          offset
        });
        aggregated.push(...result.items);
        const pageCount = result.items.length;
        const reachedEnd = pageCount < result.limit || offset + pageCount >= result.total;
        if (reachedEnd) {
          break;
        }
        offset += pageCount;
      }
      return aggregated;
    };

    void fetchAllPages()
      .then((result) => {
        if (cancelled) {
          return;
        }
        const mapped = dedupePlaceableTemplates(
          result.map((item, index) => mapPlaceableListItemToSceneObject(item, index))
        );
        setPlaceablesCatalogObjects(mapped);
        setPlaceablesCatalogStatus("ready");
        setPlaceablesCatalogError(null);
        trackTelemetryEvent("ui.workspace.placeables_mode.catalog_loaded", {
          userId,
          count: mapped.length
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setPlaceablesCatalogObjects([]);
        setActivePlaceablesPreviewObjectId(null);
        setPlaceablesModeSceneSeed(null);
        setPlaceablesCatalogStatus("error");
        setPlaceablesCatalogError("Failed to load placeables from backend.");
        trackTelemetryEvent("ui.workspace.placeables_mode.catalog_load_failed", {
          userId
        });
      });
    return () => {
      cancelled = true;
    };
  }, [
    backendAccessToken,
    isPlaceablesMode,
    placeableApiPort,
    trackTelemetryEvent,
    userId
  ]);

  useEffect(() => {
    if (!isPlaceablesMode) {
      return;
    }
    const placeableIds = placeablesModeObjects.map((object) => object.id);
    setActivePlaceablesPreviewObjectId((current) =>
      current && placeableIds.includes(current) ? current : (placeableIds[0] ?? null)
    );
  }, [isPlaceablesMode, placeablesModeObjects]);

  useEffect(() => {
    if (!isPlaceablesMode) {
      setPlaceablesSearchQuery("");
      setPlaceablesPreviewError(null);
    }
  }, [isPlaceablesMode]);

  useEffect(() => {
    if (!isPlaceablesMode || placeablesModeObjects.length < 1) {
      setPlaceablesModeSceneSeed(null);
      setPlaceablesPreviewError(null);
      return;
    }
    const activeObject =
      placeablesModeObjects.find((object) => object.id === activePlaceablesPreviewObjectId) ??
      placeablesModeObjects[0];
    if (!activeObject) {
      setPlaceablesModeSceneSeed(null);
      setPlaceablesPreviewError(null);
      return;
    }
    if (!placeableApiPort || !backendAccessToken) {
      setPlaceablesModeSceneSeed(null);
      setPlaceablesPreviewError("Backend placeable preview is unavailable.");
      return;
    }
    let cancelled = false;
    setPlaceablesPreviewError(null);
    setPlaceablesModeSceneSeed(buildPreviewSceneFromObject(activeObject));
    void placeableApiPort
      .getPlaceablePreview(backendAccessToken, activeObject.id)
      .then((preview) => {
        if (cancelled) {
          return;
        }
        setPlaceablesModeSceneSeed(
          mapPlaceablePreviewToScene(
            {
              ...preview,
              kind: "placeables",
              x: 0.5,
              y: 0.5,
              z: 0
            },
            { width: 1, height: 1 }
          )
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setPlaceablesModeSceneSeed(null);
        setPlaceablesPreviewError("Failed to load placeable preview from backend.");
      });
    return () => {
      cancelled = true;
    };
  }, [
    activePlaceablesPreviewObjectId,
    backendAccessToken,
    isPlaceablesMode,
    placeableApiPort,
    placeablesModeObjects
  ]);
  const handleSceneObjectsSnapshotChange = useCallback((objects: SceneObject[]) => {
    setSceneObjectsSnapshot(objects);
  }, []);
  const handleSceneObjectSelect = useCallback(
    (
      object: SceneObject,
      options?: {
        additive: boolean;
        sourceType: SceneObjectCatalogType;
        allowedObjectIds: string[];
      }
    ) => {
      sidebarSignalRevisionRef.current += 1;
      setSidebarSelectSignal({
        revision: sidebarSignalRevisionRef.current,
        objectId: object.id,
        additive: Boolean(options?.additive),
        sourceType: options?.sourceType ?? "all",
        allowedObjectIds: options?.allowedObjectIds ?? [object.id]
      });
    },
    []
  );
  const handleSceneObjectContextMenu = useCallback(
    (object: SceneObject, clientX: number, clientY: number) => {
      sidebarSignalRevisionRef.current += 1;
      setSidebarContextMenuSignal({
        revision: sidebarSignalRevisionRef.current,
        objectId: object.id,
        objectKind: object.kind,
        clientX,
        clientY
      });
    },
    []
  );
  return (
    <section className="workspace-layout" aria-label="workspace layout">
      <section className="workspace-canvas-layer" aria-label="workspace canvas">
        <WorkspaceCanvasViewport
          toolbarState={toolbarState}
          userId={userId}
          sceneViewportPort={sceneViewportPort}
          trackTelemetryEvent={trackTelemetryEvent}
          commandSignal={commandSignal}
          sidebarSelectSignal={sidebarSelectSignal}
          sidebarContextMenuSignal={sidebarContextMenuSignal}
          catalogScope={sceneObjectCatalogScope}
          workspaceOptions={workspaceOptions}
          leftPanelWidthPx={leftPanelWidthPx}
          rightPanelWidthPx={rightPanelWidthPx}
          onSceneObjectsSnapshotChange={handleSceneObjectsSnapshotChange}
          onSelectionSnapshotChange={setSelectedObjectIdsSnapshot}
          externalSceneSeed={externalSceneSeed}
          renderObjectIds={renderObjectIds}
        />
      </section>

      <SidebarColumn
        side="left"
        title="left sidebar"
        sections={panels.left}
        customContent={
          shouldRenderSceneObjectAddPanel ? (
            <>
              <BuilderModeSwitch
                activeModeId={activeBuilderModeId}
                onModeSelect={(modeId) => {
                  setActiveBuilderModeId(modeId);
                  trackTelemetryEvent("ui.workspace.mode.changed", {
                    userId,
                    mode: modeId
                  });
                }}
              />
              {isPlaceablesMode ? (
                <PlaceablesModePanel
                  objects={filteredPlaceablesModeObjects}
                  activeObjectId={activePlaceablesPreviewObjectId}
                  searchQuery={placeablesSearchQuery}
                  isLoading={placeablesCatalogStatus === "loading"}
                  loadErrorMessage={placeablesCatalogError}
                  previewErrorMessage={placeablesPreviewError}
                  onSearchQueryChange={(value) => {
                    setPlaceablesSearchQuery(value);
                    trackTelemetryEvent("ui.workspace.placeables_mode.filter_changed", {
                      userId,
                      query: value
                    });
                  }}
                  onObjectClick={(objectId) => {
                    setActivePlaceablesPreviewObjectId(objectId);
                    setSceneObjectCatalogScope({
                      sourceType: "placeables",
                      allowedObjectIds: [objectId]
                    });
                    trackTelemetryEvent("ui.workspace.placeables_mode.object_selected", {
                      userId,
                      objectId
                    });
                    const clickedObject = placeablesModeObjects.find((object) => object.id === objectId);
                    if (!clickedObject) {
                      return;
                    }
                    setPlaceablesModeSceneSeed(buildPreviewSceneFromObject(clickedObject));
                  }}
                />
              ) : (
                <>
                  {shouldRenderAreaSelectionPanel ? (
                    <AreaSelectionPanel
                      userId={userId}
                      backendAccessToken={backendAccessToken}
                      areaApiPort={areaApiPort}
                      trackTelemetryEvent={trackTelemetryEvent}
                      onAreaSceneSelected={(scene) => {
                        const scopedObjects = filterObjectsForWorkspaceMode(
                          scene.objects,
                          activeBuilderMode
                        );
                        setAreaSceneSeed(scene);
                        setSceneObjectCatalogScope({
                          sourceType: activeBuilderMode.defaultListType,
                          allowedObjectIds: scopedObjects.map((object) => object.id)
                        });
                      }}
                    />
                  ) : null}
                  <SceneObjectAddPanel
                    key={`scene-object-add-panel-${activeBuilderModeId}`}
                    userId={userId}
                    objects={modeScopedObjects}
                    sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
                    trackTelemetryEvent={trackTelemetryEvent}
                    allowedCatalogTypes={[...activeBuilderMode.allowedCatalogTypes]}
                    defaultActiveType={activeBuilderMode.defaultAddType}
                    hideUnsupportedCatalogTypes
                  />
                </>
              )}
            </>
          ) : undefined
        }
        collapsed={leftCollapsed}
        onToggle={onToggleLeftCollapsed}
      />

      <SidebarColumn
        side="right"
        title="right sidebar"
        sections={panels.right}
        customContent={
          shouldRenderSceneObjectsPanel ? (
            <SceneObjectListPanel
              key={`scene-object-list-panel-${activeBuilderModeId}`}
              userId={userId}
              objects={modeScopedObjects}
              sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
              trackTelemetryEvent={trackTelemetryEvent}
              allowedCatalogTypes={[...activeBuilderMode.allowedCatalogTypes]}
              defaultActiveType={activeBuilderMode.defaultListType}
              hideUnsupportedCatalogTypes
              selectedObjectIds={selectedObjectIdsSnapshot}
              onCatalogScopeChange={setSceneObjectCatalogScope}
              onObjectSelect={handleSceneObjectSelect}
              onObjectContextMenu={handleSceneObjectContextMenu}
            />
          ) : undefined
        }
        collapsed={rightCollapsed}
        onToggle={onToggleRightCollapsed}
      />
    </section>
  );
}
