import {
  parseExistingAreaVariableMutation,
  type ExistingAreaVariableMutation,
} from "../../src/modules/areas/domain/area-variable-table";
import { AuroraVariableTableValidationError } from "../../src/modules/areas/domain/aurora-variable-table";

describe("existing Area variable table contract", () => {
  const expectedEntries = [
    { sourceIndex: 0, name: "state", type: "int" as const, value: 1 },
  ];
  const sourceGitSha256 = "a".repeat(64);

  it("binds one exact changed table to an immutable lower-case GIT digest", () => {
    const expected: ExistingAreaVariableMutation = {
      expectedEntries,
      entries: [{ name: "state", type: "int", value: 2 }],
      sourceGitSha256,
    };
    expect(parseExistingAreaVariableMutation(expected)).toEqual(expected);
  });

  it.each([
    { expectedEntries, entries: [], sourceGitSha256: "A".repeat(64) },
    { expectedEntries, entries: [], sourceGitSha256: "a".repeat(63) },
    { expectedEntries, entries: [], sourceGitSha256, extra: true },
    { expectedEntries, entries: [{ name: "state", type: "int", value: 1 }], sourceGitSha256 },
  ])("rejects an unbound, inexact, or unchanged mutation %#", (candidate) => {
    expect(() => parseExistingAreaVariableMutation(candidate))
      .toThrow(AuroraVariableTableValidationError);
  });
});
