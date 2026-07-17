import type { Ref } from "react";
import type { SceneObject } from "../contracts";
import type {
  ContextMenuState,
  WorkspaceContextMenuAction
} from "../application/useWorkspaceContextMenuActions";

interface WorkspaceContextMenuProps {
  contextMenu: ContextMenuState;
  contextObject: SceneObject | null;
  menuRef?: Ref<HTMLElement>;
  isContextObjectLocked: boolean;
  isContextPropertiesSupported: boolean;
  onAction: (action: WorkspaceContextMenuAction) => void;
}

export function WorkspaceContextMenu({
  contextMenu,
  contextObject,
  menuRef,
  isContextObjectLocked,
  isContextPropertiesSupported,
  onAction
}: WorkspaceContextMenuProps) {
  return (
    <article
      ref={menuRef}
      className="canvas-context-menu"
      role="menu"
      aria-label="object context menu"
      style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="canvas-context-menu-header">
        <strong>{contextObject?.tag ?? contextMenu.objectId}</strong>
        <span>{contextMenu.objectKind}</span>
        {isContextObjectLocked ? <span>Layer locked</span> : null}
      </header>
      {contextObject?.kind !== "doors" ? (
        <button
          type="button"
          role="menuitem"
          disabled={isContextObjectLocked}
          onClick={() => onAction("adjust_location")}
        >
          Adjust location
        </button>
      ) : null}
      <button
        type="button"
        role="menuitem"
        disabled={isContextObjectLocked}
        onClick={() => onAction("duplicate")}
      >
        Duplicate
      </button>
      <button type="button" role="menuitem" onClick={() => onAction("focus")}>
        Focus
      </button>
      <button type="button" role="menuitem" onClick={() => onAction("copy_world_position")}>
        Copy world position
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={isContextObjectLocked}
        onClick={() => onAction("reset_transform")}
      >
        Reset transform
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={isContextObjectLocked}
        onClick={() => onAction("variables")}
      >
        Variables
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={isContextObjectLocked || !isContextPropertiesSupported}
        onClick={() => onAction("properties")}
      >
        Properties
      </button>
      <button
        type="button"
        role="menuitem"
        className="danger"
        disabled={isContextObjectLocked}
        onClick={() => onAction("delete")}
      >
        Delete
      </button>
    </article>
  );
}
