import {
  AuroraVariableTableValidationError,
  parseAuroraVariableMutation,
  type AuroraVariableMutation,
  type AuroraVariableProvenance,
  type AuroraVariableSourceEntry,
  type AuroraVariableTargetEntry,
} from "./aurora-variable-table";

export type AreaVariableTargetEntry = AuroraVariableTargetEntry;
export type AreaVariableSourceEntry = AuroraVariableSourceEntry;
export type AreaVariableProvenance = AuroraVariableProvenance;

export interface ExistingAreaVariableMutation extends AuroraVariableMutation {
  readonly sourceGitSha256: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

export function parseExistingAreaVariableMutation(
  value: unknown,
): Readonly<ExistingAreaVariableMutation> {
  if (!isRecord(value) || Object.keys(value).length !== 3 ||
      !("expectedEntries" in value) || !("entries" in value) ||
      !("sourceGitSha256" in value) ||
      typeof value.sourceGitSha256 !== "string" ||
      !/^[a-f0-9]{64}$/u.test(value.sourceGitSha256)) {
    throw new AuroraVariableTableValidationError("area_variables:invalid_mutation");
  }
  const mutation = parseAuroraVariableMutation({
    expectedEntries: value.expectedEntries,
    entries: value.entries,
  });
  return Object.freeze({
    ...mutation,
    sourceGitSha256: value.sourceGitSha256,
  });
}
