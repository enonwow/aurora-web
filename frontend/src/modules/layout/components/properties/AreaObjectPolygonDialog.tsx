import type { PointerEventHandler, Ref } from "react";

import type {
  AreaObjectPolygonDraft,
  AreaObjectPolygonPointField,
  AreaObjectPolygonSpawnPointField,
} from "../../../areas/application/areaObjectPolygonAuthoring";
import {
  SharedDialogActionsFooter,
  SharedPropertyDialogChrome,
} from "./SharedPropertyDialogSections";
import { MAX_AURORA_OBJECT_TAG_CODE_UNITS } from
  "../../../scene/domain/auroraObjectTag";
import { ENCOUNTER_SPAWN_OPTION_ROWS } from
  "../../../scene/domain/encounterSpawnOption";
import {
  ENCOUNTER_CREATURE_COUNT_MAX,
  ENCOUNTER_CREATURE_COUNT_MIN,
} from "../../../scene/domain/encounterCreatureCounts";
import {
  ENCOUNTER_SCRIPT_RESREF_FIELDS,
  ENCOUNTER_SCRIPT_RESREF_MAX_CODE_UNITS,
  type EncounterScriptResRefField,
} from "../../../scene/domain/encounterScriptResRefs";
import {
  TRIGGER_SCRIPT_RESREF_FIELDS,
  TRIGGER_SCRIPT_RESREF_MAX_CODE_UNITS,
  type TriggerScriptResRefField,
} from "../../../scene/domain/triggerScriptResRefs";
import {
  MAX_TRIGGER_LINKED_TO_CODE_UNITS,
  type TriggerTransitionStorage,
} from "../../../scene/domain/triggerTransitionStorage";
import type {
  SceneEncounterDifficultyCatalog,
  SceneObjectEncounterCreatureListBlueprintTargetEntry,
  ScenePlaceableFactionCatalog,
} from "../../../scene/contracts";
import { readPlaceableFactionCatalog } from "../../../scene/domain/placeableFaction";
import { readEncounterDifficultyCatalog } from
  "../../../scene/domain/encounterDifficulty";
import { MAX_ENCOUNTER_LOCALIZED_NAME_ASCII_BYTES } from
  "../../../scene/domain/encounterLocalizedName";
import { MAX_TRIGGER_LOCALIZED_NAME_ASCII_BYTES } from
  "../../../scene/domain/triggerLocalizedName";
import { ENCOUNTER_TEMPLATE_RESREF_MAX_CODE_UNITS } from
  "../../../scene/domain/encounterTemplateResRef";
import { TRIGGER_TEMPLATE_RESREF_MAX_CODE_UNITS } from
  "../../../scene/domain/triggerTemplateResRef";
import { ENCOUNTER_EDITOR_COMMENT_MAX_CODE_UNITS } from
  "../../../scene/domain/encounterEditorComment";
import { TRIGGER_EDITOR_COMMENT_MAX_CODE_UNITS } from
  "../../../scene/domain/triggerEditorComment";
import { readEncounterVariableTargetEntries } from
  "../../../scene/domain/encounterVariableTable";
import type { AuroraVariableTargetEntry } from
  "../../../shared/domain/auroraVariableTable";
import { AuroraVariableTableEditor } from "./AuroraVariableTableEditor";
import { MAX_ENCOUNTER_CREATURE_LIST_ENTRIES } from
  "../../../scene/domain/encounterCreatureSingleSpawn";

export interface AreaObjectPolygonDialogViewModel {
  readonly objectId: string;
  readonly objectKind: "triggers" | "encounters";
  readonly draft: AreaObjectPolygonDraft;
  readonly validationMessage: string | null;
  readonly windowX: number;
  readonly windowY: number;
  readonly collapsed: boolean;
}

interface AreaObjectPolygonDialogProps {
  dialog: AreaObjectPolygonDialogViewModel;
  articleRef?: Ref<HTMLElement>;
  onToggleCollapsed: () => void;
  onClose: () => void;
  onTagChange: (value: string) => void;
  onActiveChange: (value: boolean) => void;
  onPlayerOnlyChange: (value: boolean) => void;
  onResetChange: (value: boolean) => void;
  onResetTimeChange: (value: number) => void;
  onSpawnOptionChange: (value: 0 | 1) => void;
  onRespawnsFiniteChange: (value: number) => void;
  onRespawnsInfiniteChange: (value: boolean) => void;
  onMaximumCreaturesChange: (value: number) => void;
  onMinimumCreaturesChange: (value: number) => void;
  onScriptResRefChange?: (field: EncounterScriptResRefField, value: string) => void;
  onTriggerScriptResRefChange?: (
    field: TriggerScriptResRefField,
    value: string,
  ) => void;
  onTriggerTransitionStorageChange?: (value: TriggerTransitionStorage) => void;
  encounterFactionCatalog?: ScenePlaceableFactionCatalog | null;
  onFactionChange?: (value: number) => void;
  encounterDifficultyCatalog?: SceneEncounterDifficultyCatalog | null;
  onDifficultyChange?: (difficultyIndex: number) => void;
  onLocalizedNameChange?: (value: string) => void;
  onTemplateResRefChange?: (value: string) => void;
  onEditorCommentChange?: (value: string) => void;
  onVariablesChange?: (value: readonly AuroraVariableTargetEntry[]) => void;
  creatureBlueprintOptions?: readonly SceneObjectEncounterCreatureListBlueprintTargetEntry[];
  onCreatureSingleSpawnChange?: (index: number, value: boolean) => void;
  onAddCreature?: (entry: SceneObjectEncounterCreatureListBlueprintTargetEntry) => void;
  onReplaceCreature?: (
    index: number,
    entry: SceneObjectEncounterCreatureListBlueprintTargetEntry,
  ) => void;
  onRemoveCreature?: (index: number) => void;
  onMoveCreature?: (index: number, direction: -1 | 1) => void;
  onSpawnPointChange?: (
    index: number,
    field: AreaObjectPolygonSpawnPointField,
    value: number,
  ) => void;
  onAddSpawnPoint?: () => void;
  onRemoveSpawnPoint?: (index: number) => void;
  onMoveSpawnPoint?: (index: number, direction: -1 | 1) => void;
  onPointChange: (
    pointIndex: number,
    field: AreaObjectPolygonPointField,
    value: string,
  ) => void;
  onAddPoint: () => void;
  onRemovePoint: (pointIndex: number) => void;
  onResetToSource: () => void;
  onApply: (closeAfterApply: boolean) => void;
  onHeaderPointerDown?: PointerEventHandler<HTMLElement>;
  onHeaderPointerMove?: PointerEventHandler<HTMLElement>;
  onHeaderPointerUp?: PointerEventHandler<HTMLElement>;
  onHeaderPointerCancel?: PointerEventHandler<HTMLElement>;
}

export function AreaObjectPolygonDialog({
  dialog,
  articleRef,
  onToggleCollapsed,
  onClose,
  onTagChange,
  onActiveChange,
  onPlayerOnlyChange,
  onResetChange,
  onResetTimeChange,
  onSpawnOptionChange,
  onRespawnsFiniteChange,
  onRespawnsInfiniteChange,
  onMaximumCreaturesChange,
  onMinimumCreaturesChange,
  onScriptResRefChange,
  onTriggerScriptResRefChange,
  onTriggerTransitionStorageChange,
  encounterFactionCatalog,
  onFactionChange,
  encounterDifficultyCatalog,
  onDifficultyChange,
  onLocalizedNameChange,
  onTemplateResRefChange,
  onEditorCommentChange,
  onVariablesChange,
  creatureBlueprintOptions = [],
  onCreatureSingleSpawnChange,
  onAddCreature,
  onReplaceCreature,
  onRemoveCreature,
  onMoveCreature,
  onSpawnPointChange,
  onAddSpawnPoint,
  onRemoveSpawnPoint,
  onMoveSpawnPoint,
  onPointChange,
  onAddPoint,
  onRemovePoint,
  onResetToSource,
  onApply,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
  onHeaderPointerCancel,
}: AreaObjectPolygonDialogProps) {
  const familyLabel = dialog.objectKind === "triggers" ? "Trigger" : "Encounter";
  const tagEditable = dialog.draft.tagControlState === "ACTIVE_NOW";
  const activeEditable = dialog.draft.activeControlState === "ACTIVE_NOW";
  const playerOnlyEditable = dialog.draft.playerOnlyControlState === "ACTIVE_NOW";
  const resetEditable = dialog.draft.resetControlState === "ACTIVE_NOW";
  const resetTimeEditable = dialog.draft.resetTimeControlState === "ACTIVE_NOW";
  const spawnOptionEditable = dialog.draft.spawnOptionControlState === "ACTIVE_NOW";
  const respawnsEditable = dialog.draft.respawnsControlState === "ACTIVE_NOW";
  const respawnsInfiniteEditable =
    dialog.draft.respawnsInfiniteControlState === "ACTIVE_NOW";
  const creatureCountsEditable =
    dialog.draft.creatureCountsControlState === "ACTIVE_NOW";
  const scriptResRefsEditable =
    dialog.draft.scriptResRefsControlState === "ACTIVE_NOW";
  const triggerScriptResRefsEditable =
    dialog.draft.triggerScriptResRefsControlState === "ACTIVE_NOW";
  const triggerTransitionStorageEditable =
    dialog.draft.triggerTransitionStorageControlState === "ACTIVE_NOW";
  const factionEditable = dialog.draft.factionControlState === "ACTIVE_NOW";
  const difficultyEditable = dialog.draft.difficultyControlState === "ACTIVE_NOW";
  const localizedNameEditable =
    dialog.draft.localizedNameControlState === "ACTIVE_NOW";
  const templateResRefEditable =
    dialog.draft.templateResRefControlState === "ACTIVE_NOW";
  const editorCommentEditable =
    dialog.draft.editorCommentControlState === "ACTIVE_NOW";
  const variablesEditable = dialog.draft.variablesControlState === "ACTIVE_NOW";
  const creatureListEditable = dialog.draft.creatureListControlState === "ACTIVE_NOW";
  const spawnPointsEditable = dialog.draft.spawnPointsControlState === "ACTIVE_NOW";
  const variables = dialog.draft.variables ?? [];
  const commitVariables = (next: readonly AuroraVariableTargetEntry[]) => {
    if (!variablesEditable) return;
    const parsed = readEncounterVariableTargetEntries(next);
    if (parsed) onVariablesChange?.(parsed.map((entry) => ({ ...entry })));
  };
  const exactFactionCatalog = readPlaceableFactionCatalog(
    encounterFactionCatalog,
  );
  const encounterFactionRows = exactFactionCatalog?.rows.filter(
    (row) => row.factionId >= 1,
  ) ?? [];
  const exactDifficultyCatalog = readEncounterDifficultyCatalog(
    encounterDifficultyCatalog,
  );
  const encounterDifficultyRows = exactDifficultyCatalog?.rows ?? [];
  const blueprintOptionValue = (
    entry: SceneObjectEncounterCreatureListBlueprintTargetEntry,
  ) => `${entry.templateId}|${entry.sourceSha256}|${entry.sourceObjectKey}`;
  const findBlueprintOption = (value: string) => creatureBlueprintOptions.find(
    (entry) => blueprintOptionValue(entry) === value,
  );
  return (
    <SharedPropertyDialogChrome
      articleRef={articleRef}
      articleClassName="canvas-area-object-polygon-dialog"
      ariaLabel={`${familyLabel} properties`}
      windowX={dialog.windowX}
      windowY={dialog.windowY}
      headerClassName="canvas-area-object-polygon-header"
      headerCopyClassName="canvas-area-object-polygon-header-copy"
      headerActionsClassName="canvas-area-object-polygon-header-actions"
      title={`${familyLabel} Properties`}
      subtitle={`${dialog.draft.points.length} native-local points · ${dialog.objectId}`}
      collapsed={dialog.collapsed}
      collapseLabel="Collapse polygon geometry dialog"
      expandLabel="Expand polygon geometry dialog"
      closeLabel="Close polygon geometry dialog"
      onToggleCollapsed={onToggleCollapsed}
      onClose={onClose}
      onArticleMouseDown={(event) => event.stopPropagation()}
      onArticleContextMenu={(event) => event.preventDefault()}
      onHeaderPointerDown={onHeaderPointerDown}
      onHeaderPointerMove={onHeaderPointerMove}
      onHeaderPointerUp={onHeaderPointerUp}
      onHeaderPointerCancel={onHeaderPointerCancel}
    >
      <section className="canvas-area-object-polygon-body">
        {dialog.draft.tag !== undefined
        || dialog.draft.templateResRef !== undefined
        || dialog.draft.localizedName !== undefined
         || dialog.draft.editorComment !== undefined
        || dialog.draft.triggerScriptResRefs !== undefined
        || dialog.draft.triggerTransitionStorage !== undefined
        || (dialog.objectKind === "encounters" && (
          dialog.draft.variables !== undefined
           || dialog.draft.creatureList !== undefined
           || dialog.draft.spawnPoints !== undefined
          ||
          dialog.draft.active !== undefined
          || dialog.draft.playerOnly !== undefined
          || dialog.draft.reset !== undefined
          || dialog.draft.resetTime !== undefined
          || dialog.draft.spawnOption !== undefined
          || dialog.draft.respawns !== undefined
          || dialog.draft.creatureCounts !== undefined
          || dialog.draft.scriptResRefs !== undefined
          || dialog.draft.factionId !== undefined
        )) ? (
          <section
            className="canvas-area-object-polygon-identity"
            aria-label={`${familyLabel} identity`}
          >
            {dialog.draft.localizedName !== undefined ? (
              <>
                <label>
                  <span>Name</span>
                  <span className="canvas-property-support-state">
                    {localizedNameEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="text"
                    aria-label={`${familyLabel} Name`}
                    value={dialog.draft.localizedName}
                    maxLength={dialog.objectKind === "triggers"
                      ? MAX_TRIGGER_LOCALIZED_NAME_ASCII_BYTES
                      : MAX_ENCOUNTER_LOCALIZED_NAME_ASCII_BYTES}
                    disabled={!localizedNameEditable}
                    onChange={(event) => onLocalizedNameChange?.(event.target.value)}
                  />
                </label>
                <small>
                  {localizedNameEditable
                    ? `ACTIVE_NOW: exact retained inline English ASCII ${familyLabel} LocalizedName`
                    : `PRESERVE_ONLY: TLK-backed, multilingual, non-ASCII, or otherwise unsupported ${familyLabel} LocalizedName storage is retained unchanged`}
                </small>
              </>
            ) : null}
            {dialog.draft.templateResRef !== undefined ? (
              <>
                <label>
                  <span>Template ResRef</span>
                  <span className="canvas-property-support-state">
                    {templateResRefEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="text"
                    aria-label={`${familyLabel} Template ResRef`}
                    value={dialog.draft.templateResRef}
                    maxLength={dialog.objectKind === "triggers"
                      ? TRIGGER_TEMPLATE_RESREF_MAX_CODE_UNITS
                      : ENCOUNTER_TEMPLATE_RESREF_MAX_CODE_UNITS}
                    disabled={!templateResRefEditable}
                    onChange={(event) => onTemplateResRefChange?.(event.target.value)}
                  />
                </label>
                <small>
                  {templateResRefEditable
                    ? `ACTIVE_NOW: exact retained ${familyLabel} TemplateResRef ResRef`
                    : `PRESERVE_ONLY: exact retained ${familyLabel} TemplateResRef provenance is unavailable`}
                </small>
              </>
            ) : null}
            {dialog.draft.editorComment !== undefined ? (
              <>
                <label>
                  <span>Comments</span>
                  <span className="canvas-property-support-state">
                    {editorCommentEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <textarea
                    aria-label={`${familyLabel} Comments`}
                    value={dialog.draft.editorComment}
                    maxLength={dialog.objectKind === "triggers"
                      ? TRIGGER_EDITOR_COMMENT_MAX_CODE_UNITS
                      : ENCOUNTER_EDITOR_COMMENT_MAX_CODE_UNITS}
                    disabled={!editorCommentEditable}
                    onChange={(event) => onEditorCommentChange?.(event.target.value)}
                  />
                </label>
                <small>
                  {editorCommentEditable
                    ? `ACTIVE_NOW: exact retained paired-GIC ${familyLabel} Comment CExoString`
                    : `PRESERVE_ONLY: exact retained paired-GIC ${familyLabel} Comment provenance is unavailable`}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "encounters"
              && dialog.draft.variables !== undefined ? (
              <section className="canvas-store-variables-group">
                <p>Variables: <strong>{dialog.draft.variablesControlState}</strong></p>
                <AuroraVariableTableEditor
                  entries={variables}
                  editable={variablesEditable}
                  ariaLabelPrefix="Encounter variable"
                  actionAriaLabelPrefix="Encounter variable"
                  addButtonAriaLabel="Add Encounter variable"
                  onAdd={() => commitVariables([
                    ...variables,
                    { name: "", type: "int", value: 0 },
                  ])}
                  onUpdate={(index, entry) => commitVariables(
                    variables.map((candidate, candidateIndex) =>
                      candidateIndex === index ? entry : candidate),
                  )}
                  onMove={(index, direction) => {
                    const targetIndex = direction === "up" ? index - 1 : index + 1;
                    if (targetIndex < 0 || targetIndex >= variables.length) return;
                    const next = variables.map((entry) => ({ ...entry }));
                    [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
                    commitVariables(next);
                  }}
                  onRemove={(index) => commitVariables(
                    variables.filter((_, candidateIndex) => candidateIndex !== index),
                  )}
                />
                <small>
                  {variablesEditable
                    ? "ACTIVE_NOW: exact ordered Encounter VarTable; add, edit, remove, and reorder preserve duplicates and physical order"
                    : "PRESERVE_ONLY: exact retained Encounter VarTable provenance is unavailable"}
                </small>
              </section>
            ) : null}
            {dialog.objectKind === "encounters"
              && dialog.draft.creatureList !== undefined ? (
              <section
                className="canvas-store-variables-group"
                aria-label="Encounter Creature List"
              >
                <p>
                  Creature List: <strong>{dialog.draft.creatureListControlState}</strong>
                </p>
                {dialog.draft.creatureList.length === 0 ? (
                  <small>No CreatureList entries.</small>
                ) : dialog.draft.creatureList.map((entry, index) => (
                  <fieldset key={`${index}:${entry.resRef}`}>
                    <legend>Creature {index + 1}</legend>
                    <p>
                      ResRef: <code>{entry.resRef}</code> · Appearance: {entry.appearance}
                      {" · "}CR: {entry.challengeRating}
                    </p>
                    <label>
                      <span>Single Spawn</span>
                      <input
                        type="checkbox"
                        aria-label={`Encounter creature ${index + 1} Single Spawn`}
                        checked={entry.singleSpawn}
                        disabled={!creatureListEditable}
                        onChange={(event) => onCreatureSingleSpawnChange?.(
                          index,
                          event.target.checked,
                        )}
                      />
                    </label>
                    <label>
                      <span>Replace from creature catalog</span>
                      <select
                        aria-label={`Replace Encounter creature ${index + 1}`}
                        value={"entryKind" in entry
                            && entry.entryKind === "effective_blueprint"
                          ? blueprintOptionValue(entry)
                          : ""}
                        disabled={!creatureListEditable || creatureBlueprintOptions.length === 0}
                        onChange={(event) => {
                          const option = findBlueprintOption(event.target.value);
                          if (option) onReplaceCreature?.(index, option);
                        }}
                      >
                        <option value="">Retained source entry</option>
                        {creatureBlueprintOptions.map((option) => (
                          <option
                            key={blueprintOptionValue(option)}
                            value={blueprintOptionValue(option)}
                          >
                            {option.resRef} · Appearance {option.appearance} · CR {option.challengeRating}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="canvas-property-actions">
                      <button
                        type="button"
                        aria-label={`Move Encounter creature ${index + 1} up`}
                        disabled={!creatureListEditable || index === 0}
                        onClick={() => onMoveCreature?.(index, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        aria-label={`Move Encounter creature ${index + 1} down`}
                        disabled={!creatureListEditable
                          || index === dialog.draft.creatureList!.length - 1}
                        onClick={() => onMoveCreature?.(index, 1)}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove Encounter creature ${index + 1}`}
                        disabled={!creatureListEditable}
                        onClick={() => onRemoveCreature?.(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </fieldset>
                ))}
                <label>
                  <span>Add from creature catalog</span>
                  <select
                    aria-label="Add Encounter creature"
                    value=""
                    disabled={!creatureListEditable
                      || creatureBlueprintOptions.length === 0
                      || dialog.draft.creatureList.length
                        >= MAX_ENCOUNTER_CREATURE_LIST_ENTRIES}
                    onChange={(event) => {
                      const option = findBlueprintOption(event.target.value);
                      if (option) onAddCreature?.(option);
                    }}
                  >
                    <option value="">Select creature…</option>
                    {creatureBlueprintOptions.map((option) => (
                      <option
                        key={blueprintOptionValue(option)}
                        value={blueprintOptionValue(option)}
                      >
                        {option.resRef} · Appearance {option.appearance} · CR {option.challengeRating}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  {creatureListEditable
                    ? "ACTIVE_NOW: complete ordered CreatureList; add or replace from exact effective UTC bindings, remove, reorder, preserve duplicates, and edit SingleSpawn"
                    : "PRESERVE_ONLY: exact retained Encounter CreatureList provenance is unavailable"}
                </small>
              </section>
            ) : null}
            {dialog.objectKind === "encounters"
              && dialog.draft.spawnPoints !== undefined ? (
              <section
                className="canvas-store-variables-group"
                aria-label="Encounter Spawn Point List"
              >
                <p>
                  Spawn Point List: <strong>{dialog.draft.spawnPointsControlState}</strong>
                </p>
                {dialog.draft.spawnPoints.length === 0 ? (
                  <small>No retained SpawnPointList entries.</small>
                ) : dialog.draft.spawnPoints.map((entry, index) => (
                  <fieldset key={`spawn-point:${index}`}>
                    <legend>Spawn Point {index + 1}</legend>
                    {([
                      ["nativeX", "Native X"],
                      ["nativeY", "Native Y"],
                      ["nativeZ", "Native Z"],
                      ["orientation", "Orientation"],
                    ] as const).map(([field, label]) => (
                      <label key={field}>
                        <span>{label}</span>
                        <input
                          type="number"
                          step="any"
                          aria-label={`Encounter spawn point ${index + 1} ${label}`}
                          value={entry[field]}
                          disabled={!spawnPointsEditable}
                          onChange={(event) => onSpawnPointChange?.(
                            index,
                            field,
                            Number(event.target.value),
                          )}
                        />
                      </label>
                    ))}
                    <div className="canvas-property-actions">
                      <button
                        type="button"
                        aria-label={`Move Encounter spawn point ${index + 1} up`}
                        disabled={!spawnPointsEditable || index === 0}
                        onClick={() => onMoveSpawnPoint?.(index, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        aria-label={`Move Encounter spawn point ${index + 1} down`}
                        disabled={
                          !spawnPointsEditable
                          || index === dialog.draft.spawnPoints!.length - 1
                        }
                        onClick={() => onMoveSpawnPoint?.(index, 1)}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove Encounter spawn point ${index + 1}`}
                        disabled={!spawnPointsEditable}
                        onClick={() => onRemoveSpawnPoint?.(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </fieldset>
                ))}
                <button
                  type="button"
                  aria-label="Add Encounter spawn point"
                  disabled={!spawnPointsEditable}
                  onClick={() => onAddSpawnPoint?.()}
                >
                  Add Spawn Point
                </button>
                <small>
                  {spawnPointsEditable
                    ? "ACTIVE_NOW: exact ordered native SpawnPointList; add, edit, remove, and reorder preserve FLOAT storage and physical order"
                    : "PRESERVE_ONLY: exact retained Encounter SpawnPointList provenance is unavailable"}
                </small>
              </section>
            ) : null}
            {dialog.draft.tag !== undefined ? (
              <>
                <label>
                  <span>Tag</span>
                  <span className="canvas-property-support-state">
                    {tagEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="text"
                    aria-label={`${familyLabel} Tag`}
                    value={dialog.draft.tag}
                    maxLength={MAX_AURORA_OBJECT_TAG_CODE_UNITS}
                    disabled={!tagEditable}
                    onChange={(event) => onTagChange(event.target.value)}
                  />
                </label>
                <small>
                  {tagEditable
                    ? `ACTIVE_NOW: exact retained ${familyLabel} Tag`
                    : `PRESERVE_ONLY: exact retained ${familyLabel} Tag provenance is unavailable`}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "encounters" && dialog.draft.active !== undefined ? (
              <>
                <label>
                  <span>Active</span>
                  <span className="canvas-property-support-state">
                    {activeEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Encounter Active"
                    checked={dialog.draft.active}
                    disabled={!activeEditable}
                    onChange={(event) => onActiveChange(event.target.checked)}
                  />
                </label>
                <small>
                  {activeEditable
                    ? "ACTIVE_NOW: exact retained Encounter Active BYTE"
                    : "PRESERVE_ONLY: exact retained Encounter Active provenance is unavailable"}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "encounters" && dialog.draft.playerOnly !== undefined ? (
              <>
                <label>
                  <span>Player Triggered Only</span>
                  <span className="canvas-property-support-state">
                    {playerOnlyEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Encounter Player Triggered Only"
                    checked={dialog.draft.playerOnly}
                    disabled={!playerOnlyEditable}
                    onChange={(event) => onPlayerOnlyChange(event.target.checked)}
                  />
                </label>
                <small>
                  {playerOnlyEditable
                    ? "ACTIVE_NOW: exact retained Encounter PlayerOnly BYTE"
                    : "PRESERVE_ONLY: exact retained Encounter PlayerOnly provenance is unavailable"}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "encounters" && dialog.draft.creatureCounts ? (
              <>
                <label>
                  <span>Maximum Creatures</span>
                  <span className="canvas-property-support-state">
                    {creatureCountsEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="number"
                    aria-label="Encounter Maximum Creatures"
                    min={ENCOUNTER_CREATURE_COUNT_MIN}
                    max={ENCOUNTER_CREATURE_COUNT_MAX}
                    step={1}
                    value={dialog.draft.creatureCounts.maxCreatures}
                    disabled={!creatureCountsEditable}
                    onChange={(event) => onMaximumCreaturesChange(
                      Number(event.target.value),
                    )}
                  />
                </label>
                <label>
                  <span>Minimum Creatures</span>
                  <span className="canvas-property-support-state">
                    {creatureCountsEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="number"
                    aria-label="Encounter Minimum Creatures"
                    min={ENCOUNTER_CREATURE_COUNT_MIN}
                    max={ENCOUNTER_CREATURE_COUNT_MAX}
                    step={1}
                    value={dialog.draft.creatureCounts.recCreatures}
                    disabled={!creatureCountsEditable}
                    onChange={(event) => onMinimumCreaturesChange(
                      Number(event.target.value),
                    )}
                  />
                </label>
                <small>
                  {creatureCountsEditable
                    ? "ACTIVE_NOW: exact retained MaxCreatures/RecCreatures INT pair (1..8); editing either value preserves Minimum <= Maximum"
                    : "PRESERVE_ONLY: exact retained Encounter MaxCreatures/RecCreatures provenance is unavailable"}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "encounters" && dialog.draft.scriptResRefs ? (
              <>
                {ENCOUNTER_SCRIPT_RESREF_FIELDS.map((field) => (
                  <label key={field.key}>
                    <span>{field.uiLabel}</span>
                    <span className="canvas-property-support-state">
                      {scriptResRefsEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                    </span>
                    <input
                      type="text"
                      aria-label={`Encounter ${field.uiLabel} Script`}
                      value={dialog.draft.scriptResRefs?.[field.key] ?? ""}
                      maxLength={ENCOUNTER_SCRIPT_RESREF_MAX_CODE_UNITS}
                      disabled={!scriptResRefsEditable}
                      onChange={(event) => onScriptResRefChange?.(
                        field.key,
                        event.target.value,
                      )}
                    />
                  </label>
                ))}
                <small>
                  {scriptResRefsEditable
                    ? "ACTIVE_NOW: complete retained Encounter event-script ResRef tuple; targets use lowercase ASCII letters, digits, underscores, and at most 16 code units"
                    : "PRESERVE_ONLY: the complete exact retained Encounter event-script tuple is unavailable"}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "triggers" && dialog.draft.triggerScriptResRefs ? (
              <>
                {TRIGGER_SCRIPT_RESREF_FIELDS.map((field) => (
                  <label key={field.key}>
                    <span>{field.uiLabel}</span>
                    <span className="canvas-property-support-state">
                      {triggerScriptResRefsEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                    </span>
                    <input
                      type="text"
                      aria-label={`Trigger ${field.uiLabel} Script`}
                      value={dialog.draft.triggerScriptResRefs?.[field.key] ?? ""}
                      maxLength={TRIGGER_SCRIPT_RESREF_MAX_CODE_UNITS}
                      disabled={!triggerScriptResRefsEditable}
                      onChange={(event) => onTriggerScriptResRefChange?.(
                        field.key,
                        event.target.value,
                      )}
                    />
                  </label>
                ))}
                <small>
                  {triggerScriptResRefsEditable
                    ? "ACTIVE_NOW: complete retained Trigger event-script ResRef tuple; targets use lowercase ASCII letters, digits, underscores, and at most 16 code units"
                    : "PRESERVE_ONLY: the complete exact retained Trigger event-script tuple is unavailable"}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "triggers" && dialog.draft.triggerTransitionStorage ? (
              <>
                <label>
                  <span>Raw LinkedTo</span>
                  <span className="canvas-property-support-state">
                    {triggerTransitionStorageEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="text"
                    aria-label="Trigger Raw LinkedTo"
                    value={dialog.draft.triggerTransitionStorage.linkedTo}
                    maxLength={MAX_TRIGGER_LINKED_TO_CODE_UNITS}
                    disabled={!triggerTransitionStorageEditable}
                    onChange={(event) => onTriggerTransitionStorageChange?.({
                      ...dialog.draft.triggerTransitionStorage!,
                      linkedTo: event.target.value,
                    })}
                  />
                </label>
                <label>
                  <span>Raw LinkedToFlags</span>
                  <span className="canvas-property-support-state">
                    {triggerTransitionStorageEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="number"
                    aria-label="Trigger Raw LinkedToFlags"
                    min={0}
                    max={0xff}
                    step={1}
                    value={dialog.draft.triggerTransitionStorage.linkedToFlags}
                    disabled={!triggerTransitionStorageEditable}
                    onChange={(event) => onTriggerTransitionStorageChange?.({
                      ...dialog.draft.triggerTransitionStorage!,
                      linkedToFlags: event.target.valueAsNumber,
                    })}
                  />
                </label>
                <label>
                  <span>Raw LoadScreenID</span>
                  <span className="canvas-property-support-state">
                    {triggerTransitionStorageEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="number"
                    aria-label="Trigger Raw LoadScreenID"
                    min={0}
                    max={0xffff}
                    step={1}
                    value={dialog.draft.triggerTransitionStorage.loadScreenId}
                    disabled={!triggerTransitionStorageEditable}
                    onChange={(event) => onTriggerTransitionStorageChange?.({
                      ...dialog.draft.triggerTransitionStorage!,
                      loadScreenId: event.target.valueAsNumber,
                    })}
                  />
                </label>
                <small>
                  {triggerTransitionStorageEditable
                    ? "ACTIVE_NOW: exact retained Trigger transition storage; field meaning is intentionally not inferred"
                    : "PRESERVE_ONLY: exact retained Trigger transition storage is unavailable"}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "encounters"
              && dialog.draft.factionId !== undefined
              && encounterFactionRows.some(
                (row) => row.factionId === dialog.draft.factionId,
              ) ? (
              <>
                <label>
                  <span>Faction</span>
                  <span className="canvas-property-support-state">
                    {factionEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <select
                    aria-label="Encounter Faction"
                    value={dialog.draft.factionId}
                    disabled={!factionEditable}
                    onChange={(event) => onFactionChange?.(
                      Number(event.target.value),
                    )}
                  >
                    {encounterFactionRows.map((row) => (
                      <option key={row.factionId} value={row.factionId}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  {factionEditable
                    ? "ACTIVE_NOW: exact retained Encounter Faction DWord bound to the physical module repute.fac catalog"
                    : "PRESERVE_ONLY: exact retained Encounter Faction catalog provenance is unavailable or stale"}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "encounters"
              && dialog.draft.difficulty !== undefined
              && encounterDifficultyRows.some(
                (row) => row.rowIndex === dialog.draft.difficulty?.difficultyIndex &&
                  row.value === dialog.draft.difficulty?.difficulty,
              ) ? (
              <>
                <label>
                  <span>Difficulty</span>
                  <span className="canvas-property-support-state">
                    {difficultyEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <select
                    aria-label="Encounter Difficulty"
                    value={dialog.draft.difficulty.difficultyIndex}
                    disabled={!difficultyEditable}
                    onChange={(event) => onDifficultyChange?.(
                      Number(event.target.value),
                    )}
                  >
                    {encounterDifficultyRows.map((row) => (
                      <option key={row.rowIndex} value={row.rowIndex}>
                        {row.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  {difficultyEditable
                    ? "ACTIVE_NOW: exact retained Difficulty and DifficultyIndex pair bound to the physical encdifficulty.2da row"
                    : "PRESERVE_ONLY: exact retained Encounter Difficulty catalog provenance is unavailable or stale"}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "encounters" && dialog.draft.spawnOption !== undefined ? (
              <>
                <label>
                  <span>Spawn Option</span>
                  <span className="canvas-property-support-state">
                    {spawnOptionEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <select
                    aria-label="Encounter Spawn Option"
                    value={dialog.draft.spawnOption}
                    disabled={!spawnOptionEditable}
                    onChange={(event) => onSpawnOptionChange(
                      Number(event.target.value) as 0 | 1,
                    )}
                  >
                    {ENCOUNTER_SPAWN_OPTION_ROWS.map((row) => (
                      <option key={row.spawnOption} value={row.spawnOption}>
                        {row.label}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  {spawnOptionEditable
                    ? "ACTIVE_NOW: exact Toolset SpawnOption index"
                    : "PRESERVE_ONLY: exact retained Encounter SpawnOption provenance is unavailable"}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "encounters" && dialog.draft.reset !== undefined ? (
              <>
                <label>
                  <span>Reset</span>
                  <span className="canvas-property-support-state">
                    {resetEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Encounter Reset"
                    checked={dialog.draft.reset}
                    disabled={!resetEditable}
                    onChange={(event) => onResetChange(event.target.checked)}
                  />
                </label>
                <small>
                  {resetEditable
                    ? "ACTIVE_NOW: exact retained Encounter Reset BYTE"
                    : dialog.draft.spawnOption === 1
                      ? "PRESERVE_ONLY: Toolset disables Reset for Single Shot encounters"
                      : "PRESERVE_ONLY: exact Reset and SpawnOption provenance is unavailable"}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "encounters" && dialog.draft.resetTime !== undefined ? (
              <>
                <label>
                  <span>Reset Time</span>
                  <span className="canvas-property-support-state">
                    {resetTimeEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="number"
                    aria-label="Encounter Reset Time"
                    min={1}
                    max={32_000}
                    step={1}
                    value={dialog.draft.resetTime}
                    disabled={!resetTimeEditable || dialog.draft.reset !== true}
                    onChange={(event) => onResetTimeChange(Number(event.target.value))}
                  />
                </label>
                <small>
                  {!resetTimeEditable
                    ? dialog.draft.spawnOption === 1
                      ? "PRESERVE_ONLY: Toolset disables ResetTime for Single Shot encounters"
                      : dialog.draft.reset !== true
                        ? "PRESERVE_ONLY: enable Encounter Reset to edit the retained ResetTime INT"
                        : "PRESERVE_ONLY: exact ResetTime and SpawnOption provenance is unavailable"
                    : dialog.draft.reset !== true
                      ? "ACTIVE_NOW: enable Encounter Reset to edit the retained ResetTime INT"
                      : "ACTIVE_NOW: exact retained Encounter ResetTime INT (1..32000)"}
                </small>
              </>
            ) : null}
            {dialog.objectKind === "encounters"
              && dialog.draft.respawns !== undefined
              && dialog.draft.respawnsInfinite !== undefined ? (
              <>
                <label>
                  <span>Number of times to respawn</span>
                  <span className="canvas-property-support-state">
                    {respawnsEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="number"
                    aria-label="Encounter Number of times to respawn"
                    min={0}
                    max={32_000}
                    step={1}
                    value={dialog.draft.respawns}
                    disabled={!respawnsEditable || dialog.draft.respawnsInfinite}
                    onChange={(event) => onRespawnsFiniteChange(Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Infinite Respawn</span>
                  <span className="canvas-property-support-state">
                    {respawnsInfiniteEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Encounter Infinite Respawn"
                    checked={dialog.draft.respawnsInfinite}
                    disabled={!respawnsInfiniteEditable}
                    onChange={(event) => onRespawnsInfiniteChange(event.target.checked)}
                  />
                </label>
                <small>
                  {dialog.draft.spawnOption === 1
                    ? "PRESERVE_ONLY: Toolset disables Respawns for Single Shot encounters"
                    : dialog.draft.reset !== true
                      ? "PRESERVE_ONLY: enable Encounter Reset to edit Respawns"
                      : !respawnsInfiniteEditable
                        ? "PRESERVE_ONLY: exact Respawns, Reset and SpawnOption provenance is unavailable"
                        : dialog.draft.respawnsInfinite
                          ? "ACTIVE_NOW: Infinite sentinel -1; finite draft is retained"
                          : "ACTIVE_NOW: exact retained Encounter Respawns INT (0..32000)"}
                </small>
              </>
            ) : null}
          </section>
        ) : null}
        <p className="canvas-area-object-polygon-note">
          Coordinates are Aurora native-local units. The viewport converts them to scene units
          only for display; Apply preserves the exact ordered point list.
        </p>
        <div className="canvas-area-object-polygon-table" role="table" aria-label="Polygon points">
          <div className="canvas-area-object-polygon-row is-header" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">X</span>
            <span role="columnheader">Y</span>
            <span role="columnheader">Z</span>
            <span role="columnheader">Action</span>
          </div>
          {dialog.draft.points.map((point, pointIndex) => (
            <div className="canvas-area-object-polygon-row" role="row" key={pointIndex}>
              <span role="cell">{pointIndex + 1}</span>
              {(["x", "y", "z"] as const).map((field) => (
                <label role="cell" key={field}>
                  <span className="canvas-accessibility-hidden">
                    Point {pointIndex + 1} {field.toUpperCase()}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={point[field]}
                    aria-label={`Point ${pointIndex + 1} ${field.toUpperCase()}`}
                    onChange={(event) => onPointChange(pointIndex, field, event.target.value)}
                  />
                </label>
              ))}
              <span role="cell">
                <button
                  type="button"
                  disabled={dialog.draft.points.length <= 3}
                  onClick={() => onRemovePoint(pointIndex)}
                  aria-label={`Remove point ${pointIndex + 1}`}
                >
                  Remove
                </button>
              </span>
            </div>
          ))}
        </div>
        {dialog.validationMessage ? (
          <p className="canvas-area-object-polygon-error" role="alert">
            {dialog.validationMessage}
          </p>
        ) : null}
        <div className="canvas-area-object-polygon-tools">
          <button type="button" onClick={onAddPoint}>Add point</button>
          <button type="button" onClick={onResetToSource}>Reset to source</button>
        </div>
        <SharedDialogActionsFooter
          className="canvas-area-object-polygon-actions"
          onApply={() => onApply(false)}
          onOk={() => onApply(true)}
          onCancel={onClose}
        />
      </section>
    </SharedPropertyDialogChrome>
  );
}
