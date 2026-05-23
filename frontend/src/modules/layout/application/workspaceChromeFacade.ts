import type { UserRole } from "../../auth/contracts";
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
  getRoleToolbarGroups(role: UserRole): ToolbarGroup[];
  getRoleQuickActions(role: UserRole): ToolbarAction[];
  getRoleKeyboardShortcuts(role: UserRole): KeyboardShortcut[];
  createDefaultToolbarState(): WorkspaceToolbarState;
  applyToolbarAction(
    current: WorkspaceToolbarState,
    actionKey: ToolbarActionKey
  ): WorkspaceToolbarState;
  getRoleWorkspacePanels(role: UserRole): RoleWorkspacePanels;
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
  ToolbarAction,
  ToolbarActionKey,
  ToolbarGroup,
  WorkspaceCommandSignal,
  WorkspaceToolbarState
};
