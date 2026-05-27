import type { WorkspaceUserRole } from "../contracts";
import {
  applyToolbarAction,
  createDefaultToolbarState,
  getRoleKeyboardShortcuts,
  getRoleQuickActions,
  getRoleToolbarGroups,
  type KeyboardShortcut,
  type SelectionScope,
  type ToolbarAction,
  type ToolbarActionKey,
  type ToolbarGroup,
  type WorkspaceCommandSignal,
  type WorkspaceToolbarState
} from "../roleTopbarPolicy";
import {
  getRoleWorkspacePanels,
  type RoleWorkspacePanels,
  type SidebarSection
} from "../roleSidebarPolicy";

export interface WorkspaceChromeFacade {
  getRoleToolbarGroups(role: WorkspaceUserRole): ToolbarGroup[];
  getRoleQuickActions(role: WorkspaceUserRole): ToolbarAction[];
  getRoleKeyboardShortcuts(role: WorkspaceUserRole): KeyboardShortcut[];
  createDefaultToolbarState(): WorkspaceToolbarState;
  applyToolbarAction(
    current: WorkspaceToolbarState,
    actionKey: ToolbarActionKey
  ): WorkspaceToolbarState;
  getRoleWorkspacePanels(role: WorkspaceUserRole): RoleWorkspacePanels;
}

export function createWorkspaceChromeFacade(): WorkspaceChromeFacade {
  return {
    getRoleToolbarGroups(role) {
      return getRoleToolbarGroups(role);
    },
    getRoleQuickActions(role) {
      return getRoleQuickActions(role);
    },
    getRoleKeyboardShortcuts(role) {
      return getRoleKeyboardShortcuts(role);
    },
    createDefaultToolbarState() {
      return createDefaultToolbarState();
    },
    applyToolbarAction(current, actionKey) {
      return applyToolbarAction(current, actionKey);
    },
    getRoleWorkspacePanels(role) {
      return getRoleWorkspacePanels(role);
    }
  };
}

export type {
  KeyboardShortcut,
  RoleWorkspacePanels,
  SelectionScope,
  SidebarSection,
  WorkspaceUserRole,
  ToolbarAction,
  ToolbarActionKey,
  ToolbarGroup,
  WorkspaceCommandSignal,
  WorkspaceToolbarState
};
