import { useMemo, useState } from "react";
import type {
  AuroraAreaEditingState,
  AuroraAreaTilesetDefinition
} from "../../scene/domain/auroraAreaEditing";
import {
  AURORA_AREA_TILE_PROPERTY_FIELDS,
  applyAuroraAreaTileProperties,
  resetAuroraAreaTilePropertiesToSetDefaults,
  type AuroraAreaTilePropertyField,
  type AuroraAreaTilePropertyPatch
} from "../../scene/domain/auroraAreaTileProperties";

interface AuroraAreaTilePropertiesDialogProps {
  state: AuroraAreaEditingState;
  definition: AuroraAreaTilesetDefinition;
  tileIds: readonly string[];
  onApply: (state: AuroraAreaEditingState) => void;
  onCancel: () => void;
}

const LABELS: Record<AuroraAreaTilePropertyField, string> = {
  mainLight1: "Main Light 1",
  mainLight2: "Main Light 2",
  sourceLight1: "Source Light 1",
  sourceLight2: "Source Light 2",
  animLoop1: "Animation Loop 1",
  animLoop2: "Animation Loop 2",
  animLoop3: "Animation Loop 3"
};

export function AuroraAreaTilePropertiesDialog({
  state,
  definition,
  tileIds,
  onApply,
  onCancel
}: AuroraAreaTilePropertiesDialogProps) {
  const [workingState, setWorkingState] = useState(state);
  const selectedTiles = useMemo(
    () => workingState.tiles.filter((tile) => tileIds.includes(tile.id)),
    [tileIds, workingState]
  );
  const [drafts, setDrafts] = useState(() => commonDrafts(state, tileIds));
  const [touched, setTouched] = useState<Set<AuroraAreaTilePropertyField>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);

  const changeDraft = (field: AuroraAreaTilePropertyField, value: string) => {
    setDrafts((current) => ({ ...current, [field]: value }));
    setTouched((current) => new Set(current).add(field));
    setMessage(null);
  };

  const loadDefaults = () => {
    const result = resetAuroraAreaTilePropertiesToSetDefaults(
      workingState,
      definition,
      tileIds
    );
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setWorkingState(result.state);
    setDrafts(commonDrafts(result.state, tileIds));
    setTouched(new Set());
    setMessage(null);
  };

  const apply = () => {
    const patch: AuroraAreaTilePropertyPatch = {};
    for (const field of touched) {
      const raw = drafts[field].trim();
      patch[field] = raw === "" ? null : Number(raw);
    }
    const result = applyAuroraAreaTileProperties(workingState, tileIds, patch);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (!tilePropertiesDiffer(state, result.state, tileIds)) {
      onCancel();
      return;
    }
    onApply(result.state);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Tile Properties" className="canvas-dialog">
      <h3>Tile Properties</h3>
      <p>{selectedTiles.length} tile(s) selected</p>
      {AURORA_AREA_TILE_PROPERTY_FIELDS.map((field) => (
        <label key={field}>
          {LABELS[field]}
          <input
            type="number"
            min={0}
            max={255}
            value={drafts[field]}
            placeholder="Mixed / unset"
            onChange={(event) => changeDraft(field, event.target.value)}
          />
        </label>
      ))}
      {message ? <p role="alert">{message}</p> : null}
      <div role="group" aria-label="Tile Properties actions">
        <button type="button" onClick={loadDefaults}>Defaults</button>
        <button type="button" onClick={apply}>OK</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function tilePropertiesDiffer(
  initial: AuroraAreaEditingState,
  next: AuroraAreaEditingState,
  tileIds: readonly string[]
): boolean {
  return tileIds.some((tileId) => {
    const before = initial.tiles.find((tile) => tile.id === tileId);
    const after = next.tiles.find((tile) => tile.id === tileId);
    return !before || !after || AURORA_AREA_TILE_PROPERTY_FIELDS.some(
      (field) => before[field] !== after[field]
    );
  });
}

function commonDrafts(
  state: AuroraAreaEditingState,
  tileIds: readonly string[]
): Record<AuroraAreaTilePropertyField, string> {
  const selected = state.tiles.filter((tile) => tileIds.includes(tile.id));
  return Object.fromEntries(
    AURORA_AREA_TILE_PROPERTY_FIELDS.map((field) => {
      const values = selected.map((tile) => tile[field]);
      const first = values[0];
      const common = values.length > 0 && values.every((value) => value === first);
      return [field, common && first !== undefined ? String(first) : ""];
    })
  ) as Record<AuroraAreaTilePropertyField, string>;
}
