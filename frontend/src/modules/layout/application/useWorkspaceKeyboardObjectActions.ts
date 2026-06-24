import { useEffect } from "react";
import type { WorkspaceOptionSettings } from "./layoutPreferencesFacade";
import type { WorkspaceToolbarState } from "./workspaceChromeFacade";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

interface UseWorkspaceKeyboardObjectActionsArgs {
  selectedObjectCount: number;
  toolbarState: WorkspaceToolbarState;
  workspaceOptions: WorkspaceOptionSettings;
  copySelectedObjectsToClipboard: (source: string) => unknown;
  cutSelectedObjectsToClipboard: (source: string) => unknown;
  deleteSelectedObjects: (source: string) => unknown;
  moveSelectedObjectsByDelta: (
    delta: { x: number; y: number },
    source: string
  ) => unknown;
  pasteClipboardObjects: (source: string) => unknown;
}

export function useWorkspaceKeyboardObjectActions({
  selectedObjectCount,
  toolbarState,
  workspaceOptions,
  copySelectedObjectsToClipboard,
  cutSelectedObjectsToClipboard,
  deleteSelectedObjects,
  moveSelectedObjectsByDelta,
  pasteClipboardObjects
}: UseWorkspaceKeyboardObjectActionsArgs) {
  useEffect(() => {
    const handleKeyboardObjectActions = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const isMeta = event.ctrlKey || event.metaKey;
      const lowerKey = event.key.toLowerCase();

      if (isMeta && lowerKey === "c") {
        event.preventDefault();
        copySelectedObjectsToClipboard("keyboard_shortcut");
        return;
      }

      if (isMeta && lowerKey === "x") {
        event.preventDefault();
        cutSelectedObjectsToClipboard("keyboard_shortcut");
        return;
      }

      if (isMeta && lowerKey === "v") {
        event.preventDefault();
        pasteClipboardObjects("keyboard_shortcut");
        return;
      }

      if (
        (event.key === "ArrowUp" ||
          event.key === "ArrowDown" ||
          event.key === "ArrowLeft" ||
          event.key === "ArrowRight") &&
        selectedObjectCount > 0
      ) {
        const baseStep = toolbarState.canvasDebug.snapGrid
          ? Math.max(0.1, workspaceOptions.snapGridStep)
          : 0.1;
        const step = event.shiftKey ? baseStep * 2 : baseStep;
        let deltaX = 0;
        let deltaY = 0;

        if (event.key === "ArrowUp") {
          deltaY = step;
        } else if (event.key === "ArrowDown") {
          deltaY = -step;
        } else if (event.key === "ArrowLeft") {
          deltaX = -step;
        } else if (event.key === "ArrowRight") {
          deltaX = step;
        }

        event.preventDefault();
        moveSelectedObjectsByDelta({ x: deltaX, y: deltaY }, "keyboard_shortcut_nudge");
        return;
      }

      if ((event.key !== "Delete" && event.key !== "Backspace") || selectedObjectCount === 0) {
        return;
      }

      event.preventDefault();
      deleteSelectedObjects("keyboard_shortcut");
    };

    window.addEventListener("keydown", handleKeyboardObjectActions);
    return () => window.removeEventListener("keydown", handleKeyboardObjectActions);
  }, [
    copySelectedObjectsToClipboard,
    cutSelectedObjectsToClipboard,
    deleteSelectedObjects,
    moveSelectedObjectsByDelta,
    pasteClipboardObjects,
    selectedObjectCount,
    toolbarState.canvasDebug.snapGrid,
    workspaceOptions.snapGridStep
  ]);
}
