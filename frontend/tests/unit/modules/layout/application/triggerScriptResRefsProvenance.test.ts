import {
  materializeExistingTriggerScriptResRefs,
  reduceExistingTriggerScriptResRef,
} from "../../../../../src/modules/layout/application/triggerScriptResRefsProvenance";

const original = {
  onDisarm: "On_Disarm",
  onTrapTriggered: "on_trap",
  onClick: "",
  onHeartbeat: "heartbeat_01",
  onEnter: "on_enter",
  onExit: "on_exit",
  onUserDefined: "user_defined",
};
const source = {
  type: "aurora_git" as const,
  sourceKind: "trigger" as const,
  sourceIndex: 0,
  triggerScriptResRefsStorage: original,
};

describe("retained Trigger event-script provenance", () => {
  it("updates one field while canonicalizing the complete tuple like the native writer", () => {
    expect(reduceExistingTriggerScriptResRef(
      source,
      original,
      "onDisarm",
      "new_disarm",
    )).toEqual({
      ...original,
      onDisarm: "new_disarm",
      onTrapTriggered: "on_trap",
    });
  });

  it("rejects uppercase, invalid, and over-budget authoring targets", () => {
    expect(reduceExistingTriggerScriptResRef(
      source, original, "onDisarm", "UpperCase",
    )).toBe(original);
    expect(reduceExistingTriggerScriptResRef(
      source, original, "onDisarm", "bad-script",
    )).toBe(original);
    expect(reduceExistingTriggerScriptResRef(
      source, original, "onDisarm", "a".repeat(17),
    )).toBe(original);
  });

  it("materializes only a complete lowercase tuple backed by exact provenance", () => {
    const target = {
      onDisarm: "new_disarm",
      onTrapTriggered: "new_trap",
      onClick: "new_click",
      onHeartbeat: "new_heartbeat",
      onEnter: "new_enter",
      onExit: "new_exit",
      onUserDefined: "new_user",
    };
    expect(materializeExistingTriggerScriptResRefs(source, original, target))
      .toEqual(target);
    expect(materializeExistingTriggerScriptResRefs(
      { ...source, triggerScriptResRefsStorage: undefined },
      original,
      target,
    )).toEqual(original);
    expect(materializeExistingTriggerScriptResRefs(
      source,
      original,
      { ...target, onExit: "UpperCase" },
    )).toEqual(original);
  });
});
