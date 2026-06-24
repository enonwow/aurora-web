import { useCallback, useRef } from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  PointerEventHandler,
  Ref
} from "react";
import { normalizeBearingDegrees } from "../../../scene/domain/bearing";
import {
  DEGREES_PER_RADIAN,
  type AdjustLocationDraft
} from "../../application/workspaceSceneInteraction";

export interface AdjustLocationDialogViewModel {
  objectIds: string[];
  draft: AdjustLocationDraft;
  showVisualTransforms: boolean;
  mixedStaticPlaceables: boolean;
  windowX: number;
  windowY: number;
  collapsed: boolean;
}

interface BearingDialDragState {
  active: boolean;
  pointerId: number | null;
}

interface AdjustLocationDialogProps {
  dialog: AdjustLocationDialogViewModel;
  articleRef?: Ref<HTMLElement>;
  onToggleCollapsed: () => void;
  onClose: () => void;
  onDraftFieldChange: (field: keyof AdjustLocationDraft, rawValue: string) => void;
  onApply: (closeAfterApply: boolean) => void;
  onHeaderPointerDown?: PointerEventHandler<HTMLElement>;
  onHeaderPointerMove?: PointerEventHandler<HTMLElement>;
  onHeaderPointerUp?: PointerEventHandler<HTMLElement>;
  onHeaderPointerCancel?: PointerEventHandler<HTMLElement>;
}

export function AdjustLocationDialog({
  dialog,
  articleRef,
  onToggleCollapsed,
  onClose,
  onDraftFieldChange,
  onApply,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
  onHeaderPointerCancel
}: AdjustLocationDialogProps) {
  const bearingDialDragRef = useRef<BearingDialDragState>({
    active: false,
    pointerId: null
  });

  const updateBearingByDialPointer = useCallback(
    (target: HTMLElement, clientX: number, clientY: number) => {
      const rect = target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      // Aurora preview convention: 0 at top (12 o'clock), angles increase counterclockwise.
      const nextBearingDeg = normalizeBearingDegrees(
        Math.atan2(-deltaX, -deltaY) * DEGREES_PER_RADIAN
      );
      onDraftFieldChange("bearingDeg", String(nextBearingDeg));
    },
    [onDraftFieldChange]
  );

  const startBearingDialDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }
      bearingDialDragRef.current = {
        active: true,
        pointerId: event.pointerId
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      updateBearingByDialPointer(event.currentTarget, event.clientX, event.clientY);
      event.preventDefault();
    },
    [updateBearingByDialPointer]
  );

  const moveBearingDialDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = bearingDialDragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) {
        return;
      }
      updateBearingByDialPointer(event.currentTarget, event.clientX, event.clientY);
      event.preventDefault();
    },
    [updateBearingByDialPointer]
  );

  const endBearingDialDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = bearingDialDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }
    bearingDialDragRef.current = {
      active: false,
      pointerId: null
    };
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <article
      ref={articleRef}
      className={`canvas-adjust-location-dialog ${dialog.collapsed ? "is-collapsed" : ""}`}
      role="dialog"
      aria-label="Adjust location"
      style={{
        left: `${dialog.windowX}px`,
        top: `${dialog.windowY}px`
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <header
        className="canvas-adjust-location-header"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerCancel}
      >
        <div className="canvas-adjust-location-header-copy">
          <h2>Adjust Location</h2>
          <p>
            Editing {dialog.objectIds.length} object
            {dialog.objectIds.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="canvas-adjust-location-header-actions">
          <button
            type="button"
            onClick={onToggleCollapsed}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={
              dialog.collapsed
                ? "Expand adjust location dialog"
                : "Collapse adjust location dialog"
            }
          >
            {dialog.collapsed ? "+" : "-"}
          </button>
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Close adjust location dialog"
          >
            x
          </button>
        </div>
      </header>

      {!dialog.collapsed ? (
        <>
          <section className="canvas-adjust-location-grid">
            <fieldset className="canvas-adjust-location-group">
              <legend>Position</legend>
              <label>
                X
                <input
                  type="number"
                  value={dialog.draft.x}
                  step="0.01"
                  onChange={(event) => onDraftFieldChange("x", event.target.value)}
                />
              </label>
              <label>
                Y
                <input
                  type="number"
                  value={dialog.draft.y}
                  step="0.01"
                  onChange={(event) => onDraftFieldChange("y", event.target.value)}
                />
              </label>
              <label>
                Z
                <input
                  type="number"
                  value={dialog.draft.z}
                  step="0.01"
                  onChange={(event) => onDraftFieldChange("z", event.target.value)}
                />
              </label>
            </fieldset>

            <fieldset className="canvas-adjust-location-group">
              <legend>Orientation</legend>
              <label>
                Bearing
                <input
                  type="number"
                  value={dialog.draft.bearingDeg}
                  min="0"
                  max="360"
                  step="0.1"
                  onChange={(event) => onDraftFieldChange("bearingDeg", event.target.value)}
                />
              </label>
              <div
                className="canvas-bearing-dial"
                role="slider"
                aria-label="Bearing dial"
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={Math.round(dialog.draft.bearingDeg)}
                style={
                  {
                    "--bearing-dial-angle": `${dialog.draft.bearingDeg}deg`
                  } as CSSProperties
                }
                onPointerDown={startBearingDialDrag}
                onPointerMove={moveBearingDialDrag}
                onPointerUp={endBearingDialDrag}
                onPointerCancel={endBearingDialDrag}
              >
                <span className="canvas-bearing-dial-center" />
                <span className="canvas-bearing-dial-line" />
              </div>
            </fieldset>
          </section>

          {dialog.showVisualTransforms ? (
            <section className="canvas-adjust-location-grid">
              <fieldset className="canvas-adjust-location-group">
                <legend>
                  Visual Transforms
                  <span
                    className="canvas-adjust-location-info"
                    title="Placeables: when Static is ON, visual transform values are saved but not rendered. When Static is OFF, saved values are applied."
                    aria-label="Visual transform rules info"
                  >
                    i
                  </span>
                </legend>
                <label>
                  Scale
                  <input
                    type="number"
                    value={dialog.draft.scale}
                    step="0.01"
                    onChange={(event) => onDraftFieldChange("scale", event.target.value)}
                  />
                </label>
                <label>
                  X Rotation
                  <input
                    type="number"
                    value={dialog.draft.xRotationDeg}
                    step="0.1"
                    onChange={(event) =>
                      onDraftFieldChange("xRotationDeg", event.target.value)
                    }
                  />
                </label>
                <label>
                  Y Rotation
                  <input
                    type="number"
                    value={dialog.draft.yRotationDeg}
                    step="0.1"
                    onChange={(event) =>
                      onDraftFieldChange("yRotationDeg", event.target.value)
                    }
                  />
                </label>
                <label>
                  Z Rotation
                  <input
                    type="number"
                    value={dialog.draft.zRotationDeg}
                    step="0.1"
                    onChange={(event) =>
                      onDraftFieldChange("zRotationDeg", event.target.value)
                    }
                  />
                </label>
              </fieldset>

              <fieldset className="canvas-adjust-location-group">
                <legend>Visual Translation</legend>
                <label>
                  X Translation
                  <input
                    type="number"
                    value={dialog.draft.xTranslation}
                    step="0.01"
                    onChange={(event) =>
                      onDraftFieldChange("xTranslation", event.target.value)
                    }
                  />
                </label>
                <label>
                  Y Translation
                  <input
                    type="number"
                    value={dialog.draft.yTranslation}
                    step="0.01"
                    onChange={(event) =>
                      onDraftFieldChange("yTranslation", event.target.value)
                    }
                  />
                </label>
                <label>
                  Z Translation
                  <input
                    type="number"
                    value={dialog.draft.zTranslation}
                    step="0.01"
                    onChange={(event) =>
                      onDraftFieldChange("zTranslation", event.target.value)
                    }
                  />
                </label>
              </fieldset>
            </section>
          ) : null}

          {dialog.showVisualTransforms && dialog.mixedStaticPlaceables ? (
            <p className="canvas-adjust-location-note" role="note">
              Mixed Static + non-Static selection: Visual Transforms are editable and saved for all
              selected objects. Runtime applies scale/XY/rotation only where Static is OFF; Z
              height still follows Adjust Location.
            </p>
          ) : null}

          <footer className="canvas-adjust-location-actions">
            <button type="button" onClick={() => onApply(false)}>
              Apply
            </button>
            <button type="button" onClick={() => onApply(true)}>
              OK
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </footer>
        </>
      ) : null}
    </article>
  );
}
