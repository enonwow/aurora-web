import { useState } from "react";
import type { UserRole } from "../../auth/contracts";
import type { WorkspaceToolbarState } from "../roleTopbarPolicy";
import { getRoleWorkspacePanels } from "../roleSidebarPolicy";

interface WorkspaceMockLayoutProps {
  role: UserRole;
  displayName: string;
  permissions: string[];
  toolbarState: WorkspaceToolbarState;
}

function SidebarColumn({
  side,
  title,
  sections,
  collapsed,
  onToggle
}: {
  side: "left" | "right";
  title: string;
  sections: { key: string; title: string; items: string[] }[];
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
  displayName,
  permissions,
  toolbarState
}: WorkspaceMockLayoutProps) {
  const panels = getRoleWorkspacePanels(role);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <section className="workspace-layout" aria-label="workspace layout">
      <section className="workspace-canvas-layer" aria-label="workspace canvas">
        <section className="workspace-canvas-overlay">
          <header className="canvas-header">
            <h1>Aurora Web Workspace</h1>
            <p>
              Logged as <strong>{displayName}</strong> ({role})
            </p>
            <p>
              Selection mode: <strong>{toolbarState.selectionMode}</strong>
            </p>
            <p>
              Selection scope: <strong>{toolbarState.selectionScope}</strong>
            </p>
          </header>

          <section className="canvas-meta">
            <h2>Permissions</h2>
            <ul>
              {permissions.map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
          </section>

          <section className="canvas-meta">
            <h2>Visible Layers</h2>
            <ul>
              {Object.entries(toolbarState.visibility).map(([layer, visible]) => (
                <li key={layer}>
                  {layer}: {visible ? "on" : "off"}
                </li>
              ))}
            </ul>
          </section>
        </section>
        <section className="canvas-stage">
          <p>Canvas mock: area/objects render surface goes here.</p>
        </section>
      </section>

      <SidebarColumn
        side="left"
        title="left sidebar"
        sections={panels.left}
        collapsed={leftCollapsed}
        onToggle={() => setLeftCollapsed((current) => !current)}
      />

      <SidebarColumn
        side="right"
        title="right sidebar"
        sections={panels.right}
        collapsed={rightCollapsed}
        onToggle={() => setRightCollapsed((current) => !current)}
      />
    </section>
  );
}
