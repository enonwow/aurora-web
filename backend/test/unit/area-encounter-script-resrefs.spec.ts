import {
  areaEncounterScriptResRefsStoragesEqual,
  readAreaEncounterScriptResRefsStorage,
  readAreaEncounterScriptResRefsTargetStorage,
  readExistingAreaEncounterScriptResRefsMutation,
} from "../../src/modules/areas/domain/area-encounter-script-resrefs";

const source = Object.freeze({
  onEntered: "On_Enter",
  onExit: "on_exit",
  onExhausted: "",
  onHeartbeat: "heartbeat_01",
  onUserDefined: "user_defined",
});

describe("existing Area Encounter event-script tuple contract", () => {
  it("admits one complete exact source tuple including empty and mixed-case ResRefs", () => {
    const admitted = readAreaEncounterScriptResRefsStorage(source);
    expect(admitted).toEqual(source);
    expect(Object.isFrozen(admitted)).toBe(true);
  });

  it.each([
    ["partial", { ...source, onEntered: undefined }],
    ["unexpected key", { ...source, extra: "" }],
    ["over budget", { ...source, onEntered: "a".repeat(17) }],
    ["invalid character", { ...source, onEntered: "bad-script" }],
  ])("rejects %s source storage", (_label, value) => {
    expect(readAreaEncounterScriptResRefsStorage(value)).toBeNull();
  });

  it("requires lowercase authoring targets", () => {
    expect(readAreaEncounterScriptResRefsTargetStorage({
      ...source,
      onEntered: "on_enter",
    })).not.toBeNull();
    expect(readAreaEncounterScriptResRefsTargetStorage(source)).toBeNull();
  });

  it("admits only a complete changed compare-and-swap tuple", () => {
    const target = { ...source, onEntered: "on_enter", onExit: "new_exit" };
    const mutation = readExistingAreaEncounterScriptResRefsMutation({
      expectedValue: source,
      value: target,
    });
    expect(mutation).toEqual({ expectedValue: source, value: target });
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(areaEncounterScriptResRefsStoragesEqual(source, source)).toBe(true);
    expect(areaEncounterScriptResRefsStoragesEqual(source, target)).toBe(false);
    expect(readExistingAreaEncounterScriptResRefsMutation({
      expectedValue: source,
      value: { ...source, onEntered: "on_enter" },
    })).not.toBeNull();
    expect(readExistingAreaEncounterScriptResRefsMutation({
      expectedValue: source,
      value: source,
    })).toBeNull();
  });
});
