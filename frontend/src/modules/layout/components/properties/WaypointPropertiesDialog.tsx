import { useState, type PointerEventHandler, type Ref } from "react";

import type { WaypointPropertiesDialogState } from
  "../../application/waypointPropertiesDraft";
import { MAX_WAYPOINT_TAG_CODE_UNITS } from
  "../../application/waypointTagProvenance";
import { WAYPOINT_TEMPLATE_RESREF_MAX_CODE_UNITS } from
  "../../application/waypointTemplateResRefProvenance";
import { MAX_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES } from
  "../../../scene/domain/waypointLocalizedName";
import { MAX_WAYPOINT_DESCRIPTION_ASCII_BYTES } from
  "../../../scene/domain/waypointDescription";
import { WAYPOINT_EDITOR_COMMENT_MAX_CODE_UNITS } from
  "../../../scene/domain/waypointEditorComment";
import { MAX_WAYPOINT_MAP_NOTE_ASCII_BYTES } from
  "../../../scene/domain/waypointMapNote";
import type { AuroraVariableTargetEntry } from
  "../../../shared/domain/auroraVariableTable";
import { AuroraVariableTableEditor } from "./AuroraVariableTableEditor";
import {
  SharedDialogActionsFooter,
  SharedPropertyDialogChrome,
} from "./SharedPropertyDialogSections";
import type { ExistingWaypointAppearanceCatalog } from
  "../../application/waypointAppearanceProvenance";

export type WaypointPropertiesDialogViewModel = Omit<
  WaypointPropertiesDialogState,
  "snapshotObject" | "anchorOffsetX" | "anchorOffsetY"
>;

interface WaypointPropertiesDialogProps {
  dialog: WaypointPropertiesDialogViewModel;
  articleRef?: Ref<HTMLElement>;
  onToggleCollapsed: () => void;
  onClose: () => void;
  onTagChange: (value: string) => void;
  onTemplateResRefChange: (value: string) => void;
  onLocalizedNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onHasMapNoteChange: (value: boolean) => void;
  onMapNoteTextChange: (value: string) => void;
  onMapNoteEnabledChange: (value: boolean) => void;
  appearanceCatalog?: ExistingWaypointAppearanceCatalog | null;
  appearanceCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  onAppearanceChange: (value: number) => void;
  onVariablesChange: (value: readonly AuroraVariableTargetEntry[]) => void;
  onCommentsChange: (value: string) => void;
  onApply: (closeAfterApply: boolean) => void;
  onHeaderPointerDown?: PointerEventHandler<HTMLElement>;
  onHeaderPointerMove?: PointerEventHandler<HTMLElement>;
  onHeaderPointerUp?: PointerEventHandler<HTMLElement>;
  onHeaderPointerCancel?: PointerEventHandler<HTMLElement>;
}

export function WaypointPropertiesDialog({
  dialog,
  articleRef,
  onToggleCollapsed,
  onClose,
  onTagChange,
  onTemplateResRefChange,
  onLocalizedNameChange,
  onDescriptionChange,
  onHasMapNoteChange,
  onMapNoteTextChange,
  onMapNoteEnabledChange,
  appearanceCatalog,
  appearanceCatalogStatus = "unavailable",
  onAppearanceChange,
  onVariablesChange,
  onCommentsChange,
  onApply,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
  onHeaderPointerCancel,
}: WaypointPropertiesDialogProps) {
  const [activeTab, setActiveTab] = useState<
    "basic" | "advanced" | "description" | "comments"
  >("basic");
  const [showVariables, setShowVariables] = useState(false);
  const tagEditable = dialog.draft.tagControlState === "ACTIVE_NOW";
  const templateResRefEditable =
    dialog.draft.templateResRefControlState === "ACTIVE_NOW";
  const localizedNameEditable =
    dialog.draft.localizedNameControlState === "ACTIVE_NOW";
  const descriptionEditable =
    dialog.draft.descriptionControlState === "ACTIVE_NOW";
  const commentsEditable = dialog.draft.commentsControlState === "ACTIVE_NOW";
  const mapNoteEditable = dialog.draft.mapNoteControlState === "ACTIVE_NOW";
  const appearanceEditable = dialog.draft.appearanceControlState === "ACTIVE_NOW" &&
    appearanceCatalogStatus === "ready" && Boolean(appearanceCatalog);
  const variablesEditable = dialog.draft.variablesControlState === "ACTIVE_NOW";
  const editable = tagEditable || templateResRefEditable || localizedNameEditable || descriptionEditable ||
    appearanceEditable ||
    mapNoteEditable || variablesEditable || commentsEditable;
  const updateVariable = (index: number, entry: AuroraVariableTargetEntry) => {
    onVariablesChange(dialog.draft.variables.map((candidate, candidateIndex) =>
      candidateIndex === index ? entry : candidate));
  };
  const moveVariable = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= dialog.draft.variables.length) return;
    const next = dialog.draft.variables.map((entry) => ({ ...entry }));
    [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
    onVariablesChange(next);
  };
  const tabs = [
    ["basic", "Basic"],
    ["advanced", "Advanced"],
    ["description", "Description"],
    ["comments", "Comments"],
  ] as const;
  return (
    <SharedPropertyDialogChrome
      articleRef={articleRef}
      articleClassName="canvas-store-properties-dialog canvas-waypoint-properties-dialog"
      ariaLabel="Waypoint properties"
      windowX={dialog.windowX}
      windowY={dialog.windowY}
      headerClassName="canvas-store-properties-header"
      headerCopyClassName="canvas-store-properties-header-copy"
      headerActionsClassName="canvas-store-properties-header-actions"
      title="Waypoint Properties"
      subtitle={`Verified retained Waypoint properties · ${dialog.objectId}`}
      collapsed={dialog.collapsed}
      collapseLabel="Collapse Waypoint properties"
      expandLabel="Expand Waypoint properties"
      closeLabel="Close Waypoint properties"
      onToggleCollapsed={onToggleCollapsed}
      onClose={onClose}
      onHeaderPointerDown={onHeaderPointerDown}
      onHeaderPointerMove={onHeaderPointerMove}
      onHeaderPointerUp={onHeaderPointerUp}
      onHeaderPointerCancel={onHeaderPointerCancel}
    >
      <section className="canvas-store-properties-body">
        <nav
          className="canvas-placeable-properties-tabs"
          aria-label="Waypoint properties tabs"
          role="tablist"
        >
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={activeTab === id ? "is-active" : undefined}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {activeTab === "basic" ? (
          <section role="tabpanel" aria-label="Basic">
            <label className="canvas-placeable-properties-row">
              <span>Tag</span>
              <input
                aria-label="Waypoint Tag"
                type="text"
                maxLength={MAX_WAYPOINT_TAG_CODE_UNITS}
                disabled={!tagEditable}
                value={dialog.draft.tag}
                onChange={(event) => onTagChange(event.currentTarget.value)}
              />
            </label>
            <label className="canvas-placeable-properties-row">
              <span>Name</span>
              <input
                aria-label="Waypoint Name"
                type="text"
                maxLength={MAX_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES}
                disabled={!localizedNameEditable}
                value={dialog.draft.localizedName}
                onChange={(event) => onLocalizedNameChange(event.currentTarget.value)}
              />
            </label>
            <label className="canvas-placeable-properties-row">
              <span>Appearance</span>
              <select
                aria-label="Waypoint Appearance"
                disabled={!appearanceEditable}
                value={dialog.draft.appearance}
                onChange={(event) => onAppearanceChange(Number(event.currentTarget.value))}
              >
                {(appearanceCatalog?.items ?? []).map((row) => (
                  <option key={row.rowIndex} value={row.rowIndex}>
                    {`#${row.rowIndex} · ${row.displayName} · ${row.modelResRef}`}
                  </option>
                ))}
              </select>
            </label>
            <small>
              {tagEditable
                ? "ACTIVE_NOW: exact retained Waypoint Tag CExoString"
                : "PRESERVE_ONLY: exact retained Waypoint Tag provenance is unavailable"}
              {" · "}
              {localizedNameEditable
                ? "ACTIVE_NOW: exact inline ASCII Waypoint LocalizedName"
                : "PRESERVE_ONLY: Waypoint LocalizedName is absent, TLK-backed, or unsupported"}
              {" · "}
              {appearanceEditable
                ? "ACTIVE_NOW: physical waypoint.2da row bound to the retained digest"
                : dialog.draft.appearanceControlState === "ACTIVE_NOW"
                  ? appearanceCatalogStatus === "loading"
                    ? "LOADING: authoritative waypoint.2da selector"
                    : "PRESERVE_ONLY: authoritative waypoint.2da selector unavailable"
                  : "PRESERVE_ONLY: exact Waypoint Appearance provenance is unavailable"}
            </small>
          </section>
        ) : activeTab === "description" ? (
          <section role="tabpanel" aria-label="Description">
            <label className="canvas-placeable-properties-row">
              <span>Description</span>
              <textarea
                aria-label="Waypoint Description"
                maxLength={MAX_WAYPOINT_DESCRIPTION_ASCII_BYTES}
                disabled={!descriptionEditable}
                value={dialog.draft.description}
                onChange={(event) => onDescriptionChange(event.currentTarget.value)}
              />
            </label>
            <small>
              {descriptionEditable
                ? "ACTIVE_NOW: exact inline ASCII Waypoint Description"
                : "PRESERVE_ONLY: Waypoint Description is absent, TLK-backed, or unsupported"}
            </small>
          </section>
        ) : activeTab === "comments" ? (
          <section role="tabpanel" aria-label="Comments">
            <label className="canvas-placeable-properties-row">
              <span>Comments</span>
              <textarea
                aria-label="Waypoint Comments"
                maxLength={WAYPOINT_EDITOR_COMMENT_MAX_CODE_UNITS}
                disabled={!commentsEditable}
                value={dialog.draft.comments}
                onChange={(event) => onCommentsChange(event.currentTarget.value)}
              />
            </label>
            <small>
              {commentsEditable
                ? "ACTIVE_NOW: exact ordinal-paired GIC Waypoint Comment"
                : "PRESERVE_ONLY: exact paired Waypoint Comment provenance is unavailable"}
            </small>
          </section>
        ) : (
          <section role="tabpanel" aria-label="Advanced">
            <label className="canvas-placeable-properties-row">
              <span>Blueprint ResRef</span>
              <input
                aria-label="Waypoint Blueprint ResRef"
                type="text"
                maxLength={WAYPOINT_TEMPLATE_RESREF_MAX_CODE_UNITS}
                disabled={!templateResRefEditable}
                value={dialog.draft.templateResRef}
                onChange={(event) =>
                  onTemplateResRefChange(event.currentTarget.value)
                }
              />
            </label>
            <small>
              {templateResRefEditable
                ? "ACTIVE_NOW: exact retained Waypoint TemplateResRef ResRef"
                : "PRESERVE_ONLY: exact Waypoint TemplateResRef provenance is unavailable"}
            </small>
            <label className="canvas-placeable-properties-row">
              <span>Waypoint Contains a Map Note</span>
              <input
                aria-label="Waypoint Contains a Map Note"
                type="checkbox"
                disabled={!mapNoteEditable}
                checked={dialog.draft.hasMapNote}
                onChange={(event) => onHasMapNoteChange(event.currentTarget.checked)}
              />
            </label>
            <label className="canvas-placeable-properties-row">
              <span>Map Note Text</span>
              <textarea
                aria-label="Waypoint Map Note Text"
                maxLength={MAX_WAYPOINT_MAP_NOTE_ASCII_BYTES}
                disabled={!mapNoteEditable || !dialog.draft.hasMapNote}
                value={dialog.draft.mapNoteText}
                onChange={(event) => onMapNoteTextChange(event.currentTarget.value)}
              />
            </label>
            <label className="canvas-placeable-properties-row">
              <span>Map Note Enabled</span>
              <input
                aria-label="Waypoint Map Note Enabled"
                type="checkbox"
                disabled={!mapNoteEditable || !dialog.draft.hasMapNote}
                checked={dialog.draft.mapNoteEnabled}
                onChange={(event) => onMapNoteEnabledChange(event.currentTarget.checked)}
              />
            </label>
            <small>
              {mapNoteEditable
                ? "ACTIVE_NOW: exact atomic HasMapNote/MapNote/MapNoteEnabled vector"
                : "PRESERVE_ONLY: MapNote vector is absent, TLK-backed, or unsupported"}
            </small>
            <div className="canvas-placeable-properties-variables-row">
              <button
                type="button"
                aria-expanded={showVariables}
                disabled={!variablesEditable}
                onClick={() => setShowVariables((current) => !current)}
              >
                Variables... ({dialog.draft.variables.length})
              </button>
              <small>{variablesEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}</small>
            </div>
            {showVariables && variablesEditable ? (
              <AuroraVariableTableEditor
                entries={dialog.draft.variables}
                editable={variablesEditable}
                ariaLabelPrefix="Waypoint variable"
                actionAriaLabelPrefix="Waypoint variable"
                addButtonAriaLabel="Add Waypoint variable"
                onAdd={() => onVariablesChange([
                  ...dialog.draft.variables,
                  { name: "", type: "int", value: 0 },
                ])}
                onUpdate={updateVariable}
                onMove={moveVariable}
                onRemove={(index) => onVariablesChange(
                  dialog.draft.variables.filter((_, candidateIndex) => candidateIndex !== index),
                )}
              />
            ) : null}
          </section>
        )}
        <SharedDialogActionsFooter
          className="canvas-store-properties-actions"
          onApply={() => onApply(false)}
          onOk={() => onApply(true)}
          onCancel={onClose}
          applyDisabled={!editable}
          okDisabled={!editable}
        />
      </section>
    </SharedPropertyDialogChrome>
  );
}
