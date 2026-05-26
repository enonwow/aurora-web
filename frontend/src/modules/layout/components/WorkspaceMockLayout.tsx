import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { SceneObject, SceneObjectKind } from "../contracts";
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

interface WorkspaceMockLayoutProps {
  role: WorkspaceUserRole;
  userId: string;
  workspaceChromeFacade: WorkspaceChromeFacade;
  sceneViewportPort: SceneViewportPort;
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
  const [sceneObjectsSnapshot, setSceneObjectsSnapshot] = useState<SceneObject[]>(
    () => sceneViewportPort.createInitialHistory(userId).present.objects
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
  const sidebarSignalRevisionRef = useRef(0);
  const leftPanelWidthPx = leftCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH_PX
    : SIDEBAR_EXPANDED_WIDTH_PX;
  const rightPanelWidthPx = rightCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH_PX
    : SIDEBAR_EXPANDED_WIDTH_PX;

  const shouldRenderSceneObjectsPanel = role === "builder";
  const shouldRenderSceneObjectAddPanel = role === "builder";
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
        />
      </section>

      <SidebarColumn
        side="left"
        title="left sidebar"
        sections={panels.left}
        customContent={
          shouldRenderSceneObjectAddPanel ? (
            <SceneObjectAddPanel
              userId={userId}
              objects={sceneObjectsSnapshot}
              sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
              trackTelemetryEvent={trackTelemetryEvent}
            />
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
              userId={userId}
              objects={sceneObjectsSnapshot}
              sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
              trackTelemetryEvent={trackTelemetryEvent}
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
