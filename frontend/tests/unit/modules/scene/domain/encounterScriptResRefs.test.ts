import {
  canEditExistingEncounterScriptResRefs,
  encounterScriptResRefsStoragesEqual,
  readEncounterScriptResRefsStorage,
  readEncounterScriptResRefsTargetStorage,
} from "../../../../../src/modules/scene/domain/encounterScriptResRefs";

const source = {
  onEntered: "On_Enter",
  onExit: "on_exit",
  onExhausted: "",
  onHeartbeat: "heartbeat_01",
  onUserDefined: "user_defined",
};

describe("Encounter event-script ResRef storage", () => {
  it("admits one complete exact source tuple and requires lowercase targets", () => {
    expect(readEncounterScriptResRefsStorage(source)).toEqual(source);
    expect(readEncounterScriptResRefsTargetStorage({
      ...source,
      onEntered: "on_enter",
    })).not.toBeNull();
    expect(readEncounterScriptResRefsTargetStorage(source)).toBeNull();
  });

  it.each([
    { ...source, onEntered: undefined },
    { ...source, onEntered: "a".repeat(17) },
    { ...source, onEntered: "bad-script" },
    { ...source, extra: "" },
  ])("rejects partial or noncanonical storage", (value) => {
    expect(readEncounterScriptResRefsStorage(value)).toBeNull();
  });

  it("gates editing on exact immutable Encounter provenance", () => {
    expect(canEditExistingEncounterScriptResRefs({
      type: "aurora_git",
      sourceKind: "encounter",
      sourceIndex: 0,
      encounterScriptResRefsStorage: source,
    })).toBe(true);
    expect(canEditExistingEncounterScriptResRefs({
      type: "aurora_git",
      sourceKind: "encounter",
      sourceIndex: 0,
      encounterScriptResRefsStorage: { ...source, onExit: "bad-script" },
    })).toBe(false);
    expect(encounterScriptResRefsStoragesEqual(source, source)).toBe(true);
  });
});
