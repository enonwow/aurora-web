import type { UserRole } from "../../auth/contracts";
import { getRoleTopbarSections } from "../roleTopbarPolicy";

interface WorkspaceTopbarProps {
  isAuthenticated: boolean;
  role?: UserRole;
  showDebugPanel: boolean;
  onToggleDebug: () => void;
  onSignOut: () => void;
}

export function WorkspaceTopbar({
  isAuthenticated,
  role,
  showDebugPanel,
  onToggleDebug,
  onSignOut
}: WorkspaceTopbarProps) {
  const sections = isAuthenticated && role ? getRoleTopbarSections(role) : [];

  return (
    <header className="topbar">
      <div className="topbar-left">
        <p className="topbar-brand">Aurora Web</p>
      </div>

      {sections.length > 0 ? (
        <nav className="topbar-nav" aria-label="workspace sections">
          {sections.map((section) => (
            <button className="topbar-nav-btn" type="button" key={section.key}>
              {section.label}
            </button>
          ))}
        </nav>
      ) : null}

      <div className="topbar-actions" data-testid="topbar-actions">
        {isAuthenticated ? (
          <>
            <button className="topbar-btn" type="button" onClick={onToggleDebug}>
              {showDebugPanel ? "Hide debug panel" : "Show debug panel"}
            </button>
            <button className="topbar-btn" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : null}
      </div>
    </header>
  );
}
