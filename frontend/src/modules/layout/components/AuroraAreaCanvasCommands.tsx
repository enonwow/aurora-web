export interface AuroraAreaCanvasCommandFeedback {
  variant: "success" | "error";
  message: string;
}

interface AuroraAreaCanvasCommandsProps {
  visible: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasSelectedTile: boolean;
  hasClipboardTiles: boolean;
  feedback: AuroraAreaCanvasCommandFeedback | null;
  leftPx: number;
  maxWidth: string;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onRemove: () => void;
}

/** Trusted-canvas entry points for Area history and tile/group clipboard commands. */
export function AuroraAreaCanvasCommands({
  visible,
  canUndo,
  canRedo,
  hasSelectedTile,
  hasClipboardTiles,
  feedback,
  leftPx,
  maxWidth,
  onUndo,
  onRedo,
  onCopy,
  onCut,
  onPaste,
  onRemove
}: AuroraAreaCanvasCommandsProps) {
  if (!visible) return null;

  return (
    <>
      <aside
        className="canvas-area-tile-commands"
        role="toolbar"
        aria-label="Area tile commands"
        style={{ left: `${leftPx}px`, maxWidth }}
      >
        <button
          type="button"
          data-area-editing-proof-action="undo"
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo tile edit
        </button>
        <button
          type="button"
          data-area-editing-proof-action="redo"
          onClick={onRedo}
          disabled={!canRedo}
        >
          Redo tile edit
        </button>
        <button type="button" onClick={onCopy} disabled={!hasSelectedTile}>Copy tile/group</button>
        <button
          type="button"
          data-area-editing-proof-action="cut-selection"
          onClick={onCut}
          disabled={!hasSelectedTile}
        >
          Cut tile/group
        </button>
        <button
          type="button"
          onClick={onPaste}
          disabled={!hasSelectedTile || !hasClipboardTiles}
        >
          Paste at selected tile
        </button>
        <button type="button" onClick={onRemove} disabled={!hasSelectedTile}>Remove tile/group</button>
      </aside>
      {feedback ? (
        <aside
          className={`canvas-area-editing-feedback canvas-area-editing-feedback-${feedback.variant}`}
          role={feedback.variant === "error" ? "alert" : "status"}
          aria-live={feedback.variant === "error" ? "assertive" : "polite"}
          style={{ left: `${leftPx}px`, maxWidth }}
        >
          {feedback.message}
        </aside>
      ) : null}
    </>
  );
}
