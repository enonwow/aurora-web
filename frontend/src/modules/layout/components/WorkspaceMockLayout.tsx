import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { UserRole } from "../../auth/contracts";
import type { SceneObject, SceneObjectKind } from "../../scene/contracts";
import { createSeedAreaScene } from "../../scene/sceneFactory";
import type {
  WorkspaceCommandSignal,
  WorkspaceToolbarState
} from "../roleTopbarPolicy";
import { getRoleWorkspacePanels } from "../roleSidebarPolicy";
import { SceneObjectListPanel } from "./SceneObjectListPanel";
import { WorkspaceCanvasViewport } from "./WorkspaceCanvasViewport";
import type { WorkspaceOptionSettings } from "../workspaceOptionSettings";

interface WorkspaceMockLayoutProps {
  role: UserRole;
  userId: string;
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
}

interface SidebarContextMenuSignal {
  revision: number;
  objectId: string;
  objectKind: SceneObjectKind;
  clientX: number;
  clientY: number;
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
  toolbarState,
  commandSignal,
  workspaceOptions,
  leftCollapsed,
  rightCollapsed,
  onToggleLeftCollapsed,
  onToggleRightCollapsed
}: WorkspaceMockLayoutProps) {
  const panels = getRoleWorkspacePanels(role);
  const [sceneObjectsSnapshot, setSceneObjectsSnapshot] = useState<SceneObject[]>(
    () => createSeedAreaScene().objects
  );
  const [sidebarSelectSignal, setSidebarSelectSignal] = useState<SidebarSelectSignal | null>(
    null
  );
  const [sidebarContextMenuSignal, setSidebarContextMenuSignal] =
    useState<SidebarContextMenuSignal | null>(null);
  const sidebarSignalRevisionRef = useRef(0);
  const leftPanelWidthPx = leftCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH_PX
    : SIDEBAR_EXPANDED_WIDTH_PX;
  const rightPanelWidthPx = rightCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH_PX
    : SIDEBAR_EXPANDED_WIDTH_PX;

  const shouldRenderSceneObjectsPanel = role === "builder";
  const handleSceneObjectsSnapshotChange = useCallback((objects: SceneObject[]) => {
    setSceneObjectsSnapshot(objects);
  }, []);
  const handleSceneObjectSelect = useCallback((object: SceneObject) => {
    sidebarSignalRevisionRef.current += 1;
    setSidebarSelectSignal({
      revision: sidebarSignalRevisionRef.current,
      objectId: object.id
    });
  }, []);
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
          commandSignal={commandSignal}
          sidebarSelectSignal={sidebarSelectSignal}
          sidebarContextMenuSignal={sidebarContextMenuSignal}
          workspaceOptions={workspaceOptions}
          leftPanelWidthPx={leftPanelWidthPx}
          rightPanelWidthPx={rightPanelWidthPx}
          onSceneObjectsSnapshotChange={handleSceneObjectsSnapshotChange}
        />
      </section>

      <SidebarColumn
        side="left"
        title="left sidebar"
        sections={panels.left}
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
