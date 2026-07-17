import {
  listWorkspaceModes,
  type WorkspaceModeId
} from "../workspaceModes";

interface WorkspaceModeSwitchProps {
  activeModeId: WorkspaceModeId;
  onModeSelect: (modeId: WorkspaceModeId) => void;
}

const COMPACT_MODE_LABELS: Record<WorkspaceModeId, string> = {
  areas_mode: "Areas",
  placeables_mode: "Placeables",
  creatures_mode: "Creatures",
  items_mode: "Items",
  sounds_mode: "Sounds"
};

export function WorkspaceModeSwitch({
  activeModeId,
  onModeSelect
}: WorkspaceModeSwitchProps) {
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
              aria-current={isActive ? "page" : undefined}
              aria-label={mode.label}
              title={mode.description}
            >
              <strong>{COMPACT_MODE_LABELS[mode.id]}</strong>
            </button>
          );
        })}
      </div>
    </article>
  );
}
