import { describe, expect, it } from "vitest";
import {
  ENCOUNTER_EDITOR_COMMENT_MAX_CODE_UNITS,
  isEncounterEditorComment,
  readEncounterEditorComment,
} from "../../../../../src/modules/scene/domain/encounterEditorComment";

describe("Encounter editor Comment", () => {
  it("admits exact empty, whitespace, Unicode, and 4096-unit values", () => {
    for (const value of ["", "  \r\n ", "e\u0301", "x".repeat(4096)]) {
      expect(isEncounterEditorComment(value)).toBe(true);
      expect(readEncounterEditorComment({ editorComment: value })).toBe(value);
    }
    expect(ENCOUNTER_EDITOR_COMMENT_MAX_CODE_UNITS).toBe(4096);
  });

  it.each([7, "bad\0value", "x".repeat(4097)])(
    "rejects noncanonical value %p",
    (value) => {
      expect(isEncounterEditorComment(value)).toBe(false);
      expect(readEncounterEditorComment({ editorComment: value })).toBeUndefined();
    },
  );
});
