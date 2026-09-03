import {
  materializeExistingEncounterScriptResRefs,
  reduceExistingEncounterScriptResRef,
} from "../../../../../src/modules/layout/application/encounterScriptResRefsProvenance";

const original = {
  onEntered: "On_Enter",
  onExit: "on_exit",
  onExhausted: "",
  onHeartbeat: "heartbeat_01",
  onUserDefined: "user_defined",
};
const source = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterScriptResRefsStorage: original,
};

describe("retained Encounter event-script provenance", () => {
  it("updates one field while retaining the complete tuple", () => {
    expect(reduceExistingEncounterScriptResRef(
      source,
      original,
      "onEntered",
      "new_enter",
    )).toEqual({ ...original, onEntered: "new_enter" });
  });

  it("rejects uppercase, invalid, and over-budget authoring targets", () => {
    expect(reduceExistingEncounterScriptResRef(
      source, original, "onEntered", "UpperCase",
    )).toBe(original);
    expect(reduceExistingEncounterScriptResRef(
      source, original, "onEntered", "bad-script",
    )).toBe(original);
    expect(reduceExistingEncounterScriptResRef(
      source, original, "onEntered", "a".repeat(17),
    )).toBe(original);
  });

  it("materializes only a complete lowercase tuple backed by exact provenance", () => {
    const target = {
      onEntered: "new_enter",
      onExit: "new_exit",
      onExhausted: "",
      onHeartbeat: "new_heartbeat",
      onUserDefined: "new_user",
    };
    expect(materializeExistingEncounterScriptResRefs(source, original, target))
      .toEqual(target);
    expect(materializeExistingEncounterScriptResRefs(
      { ...source, encounterScriptResRefsStorage: undefined },
      original,
      target,
    )).toEqual(original);
    expect(materializeExistingEncounterScriptResRefs(
      source,
      original,
      { ...target, onExit: "UpperCase" },
    )).toEqual(original);
  });
});
