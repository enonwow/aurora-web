import { useEffect, useState } from "react";
import { ServerPathPicker } from "./ServerPathPicker";
import type {
  RuntimePathBrowserScope,
  RuntimePathReadinessIssue
} from "./runtimePathOnboardingApi";

interface ServerPathListEditorProps {
  accessToken: string;
  label: string;
  field: "hakDirectories" | "itemGeneratorSourceDirectories";
  scope: RuntimePathBrowserScope;
  values: string[];
  fallbackPath?: string;
  issues: RuntimePathReadinessIssue[];
  onChange(values: string[]): void;
}

interface PathRow {
  id: number;
  value: string;
}

let nextPathRowId = 1;

function createRow(value: string): PathRow {
  return { id: nextPathRowId++, value };
}

function createRows(values: string[]): PathRow[] {
  return [...values.map(createRow), createRow("")];
}

function nonEmptyValues(rows: PathRow[]): string[] {
  return rows
    .map((row) => row.value)
    .filter((value) => value.trim().length > 0);
}

function pathListSignature(values: string[]): string {
  return JSON.stringify(values.filter((value) => value.trim().length > 0));
}

export function ServerPathListEditor({
  accessToken,
  label,
  field,
  scope,
  values,
  fallbackPath = "",
  issues,
  onChange
}: ServerPathListEditorProps) {
  const [rows, setRows] = useState<PathRow[]>(() => createRows(values));

  useEffect(() => {
    if (
      pathListSignature(nonEmptyValues(rows)) !== pathListSignature(values)
    ) {
      setRows(createRows(values));
    }
  }, [rows, values]);

  const updateRow = (rowId: number, value: string) => {
    setRows((current) => {
      let next = current.map((row) =>
        row.id === rowId ? { ...row, value } : row
      );
      next = next.filter(
        (row, index) =>
          row.value.trim().length > 0 || index === next.length - 1
      );
      if (next[next.length - 1]?.value.trim()) {
        next = [...next, createRow("")];
      }
      onChange(nonEmptyValues(next));
      return next;
    });
  };

  const removeRow = (rowId: number) => {
    setRows((current) => {
      let next = current.filter((row) => row.id !== rowId);
      if (next.length === 0 || next[next.length - 1]?.value.trim()) {
        next = [...next, createRow("")];
      }
      onChange(nonEmptyValues(next));
      return next;
    });
  };

  return (
    <fieldset className="server-path-list-fieldset">
      <legend>{label}</legend>
      <p className="server-path-list-help">
        Selecting or entering a path automatically creates the next empty row.
      </p>
      <div className="server-path-table-scroll">
        <table className="server-path-table">
          <thead>
            <tr>
              <th scope="col">Host path</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const issue = issues.find(
                (candidate) => candidate.field === `${field}.${rowIndex}`
              );
              const isEmpty = row.value.trim().length === 0;
              return (
                <tr key={row.id}>
                  <td>
                    <ServerPathPicker
                      accessToken={accessToken}
                      scope={scope}
                      selectionKind="directory"
                      value={row.value}
                      fallbackPath={fallbackPath}
                      ariaLabel={`${label} path ${rowIndex + 1}`}
                      placeholder={isEmpty ? "Choose or enter another directory" : undefined}
                      issue={issue?.message}
                      onChange={(nextValue) => updateRow(row.id, nextValue)}
                    />
                  </td>
                  <td>
                    <span
                      className={`server-path-row-status ${
                        issue
                          ? "is-invalid"
                          : isEmpty
                            ? "is-empty"
                            : "is-pending"
                      }`}
                    >
                      {issue
                        ? "Needs attention"
                        : isEmpty
                          ? "New row"
                          : "Ready to validate"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="server-path-remove-btn"
                      type="button"
                      disabled={isEmpty}
                      aria-label={`Remove ${label} path ${rowIndex + 1}`}
                      onClick={() => removeRow(row.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}
