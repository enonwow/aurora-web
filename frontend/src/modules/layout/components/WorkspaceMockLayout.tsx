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
            >
              <strong>{mode.label}</strong>
              <small>{mode.description}</small>
            </button>
          );
        })}
      </div>
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
  const [externalSceneSeed, setExternalSceneSeed] = useState<AreaScene | null>(null);
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
                    setExternalSceneSeed(scene);
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
