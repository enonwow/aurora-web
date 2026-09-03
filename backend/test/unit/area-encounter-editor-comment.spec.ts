import {
  MAX_AREA_ENCOUNTER_EDITOR_COMMENT_CODE_UNITS,
  isAreaEncounterEditorComment,
} from "../../src/modules/areas/domain/area-encounter-editor-comment";

describe("Existing Area Encounter editor Comment", () => {
  it("admits exact empty, whitespace, and 4096-code-unit values", () => {
    expect(isAreaEncounterEditorComment("")).toBe(true);
    expect(isAreaEncounterEditorComment(" west gate ")).toBe(true);
    expect(isAreaEncounterEditorComment(
      "x".repeat(MAX_AREA_ENCOUNTER_EDITOR_COMMENT_CODE_UNITS),
    )).toBe(true);
  });

  it.each([
    ["non-string", 7],
    ["NUL", "west\0gate"],
    ["over budget", "x".repeat(MAX_AREA_ENCOUNTER_EDITOR_COMMENT_CODE_UNITS + 1)],
  ])("rejects %s input", (_label, value) => {
    expect(isAreaEncounterEditorComment(value)).toBe(false);
  });
});
