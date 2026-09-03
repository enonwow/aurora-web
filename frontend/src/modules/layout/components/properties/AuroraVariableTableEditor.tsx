import {
  MAX_AURORA_VARIABLE_ENTRIES,
  MAX_AURORA_VARIABLE_NAME_CODE_UNITS,
  MAX_AURORA_VARIABLE_STRING_CODE_UNITS,
  type AuroraVariableTargetEntry,
} from "../../../shared/domain/auroraVariableTable";

interface AuroraVariableTableEditorProps {
  readonly entries: readonly AuroraVariableTargetEntry[];
  readonly editable: boolean;
  readonly ariaLabelPrefix: string;
  readonly actionAriaLabelPrefix?: string;
  readonly addButtonAriaLabel?: string;
  readonly onAdd: () => void;
  readonly onUpdate: (index: number, entry: AuroraVariableTargetEntry) => void;
  readonly onMove: (index: number, direction: "up" | "down") => void;
  readonly onRemove: (index: number) => void;
}

export function AuroraVariableTableEditor({
  entries,
  editable,
  ariaLabelPrefix,
  actionAriaLabelPrefix = ariaLabelPrefix,
  addButtonAriaLabel,
  onAdd,
  onUpdate,
  onMove,
  onRemove,
}: AuroraVariableTableEditorProps) {
  return (
    <fieldset
      className="canvas-placeable-properties-group canvas-placeable-properties-nested"
      disabled={!editable}
    >
      <legend>Variables</legend>
      <table className="canvas-creature-properties-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Type</th>
            <th scope="col">Value</th>
            <th scope="col" aria-label="Order and removal" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={`aurora_variable_${index + 1}`}>
              <td>
                <input
                  type="text"
                  value={entry.name}
                  maxLength={MAX_AURORA_VARIABLE_NAME_CODE_UNITS}
                  aria-label={`${ariaLabelPrefix} ${index + 1} name`}
                  onChange={(event) => onUpdate(index, {
                    ...entry,
                    name: event.target.value,
                  })}
                />
              </td>
              <td>
                <select
                  value={entry.type}
                  aria-label={`${ariaLabelPrefix} ${index + 1} type`}
                  onChange={(event) => {
                    const type = event.target.value as AuroraVariableTargetEntry["type"];
                    onUpdate(index, {
                      name: entry.name,
                      type,
                      value: type === "string" ? "" : 0,
                    } as AuroraVariableTargetEntry);
                  }}
                >
                  <option value="int">Int</option>
                  <option value="float">Float</option>
                  <option value="string">String</option>
                </select>
              </td>
              <td>
                {entry.type === "string" ? (
                  <input
                    type="text"
                    value={entry.value}
                    maxLength={MAX_AURORA_VARIABLE_STRING_CODE_UNITS}
                    aria-label={`${ariaLabelPrefix} ${index + 1} value`}
                    onChange={(event) => onUpdate(index, {
                      name: entry.name,
                      type: "string",
                      value: event.target.value,
                    })}
                  />
                ) : (
                  <input
                    type="number"
                    step={entry.type === "int" ? "1" : "any"}
                    value={entry.value}
                    aria-label={`${ariaLabelPrefix} ${index + 1} value`}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      if (!Number.isFinite(parsed)) return;
                      onUpdate(index, entry.type === "int"
                        ? {
                            name: entry.name,
                            type: "int",
                            value: Math.max(
                              -0x80000000,
                              Math.min(0x7fffffff, Math.trunc(parsed)),
                            ),
                          }
                        : {
                            name: entry.name,
                            type: "float",
                            value: Math.fround(parsed),
                          });
                    }}
                  />
                )}
              </td>
              <td>
                <button
                  type="button"
                  aria-label={`Move ${actionAriaLabelPrefix} ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => onMove(index, "up")}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${actionAriaLabelPrefix} ${index + 1} down`}
                  disabled={index === entries.length - 1}
                  onClick={() => onMove(index, "down")}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${actionAriaLabelPrefix} ${index + 1}`}
                  onClick={() => onRemove(index)}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="canvas-creature-properties-aux-row">
        <button
          type="button"
          aria-label={addButtonAriaLabel}
          disabled={!editable || entries.length >= MAX_AURORA_VARIABLE_ENTRIES}
          onClick={onAdd}
        >
          Add variable
        </button>
      </div>
    </fieldset>
  );
}
