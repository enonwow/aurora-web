import {
  TRIGGER_SCRIPT_RESREF_FIELDS,
  canEditExistingTriggerScriptResRefs,
  readTriggerScriptResRefsStorage,
  readTriggerScriptResRefsTargetStorage,
  triggerScriptResRefsStoragesEqual,
} from "../../../../../src/modules/scene/domain/triggerScriptResRefs";

const source = {
  onDisarm: "On_Disarm",
  onTrapTriggered: "on_trap",
  onClick: "",
  onHeartbeat: "heartbeat_01",
  onEnter: "on_enter",
  onExit: "on_exit",
  onUserDefined: "user_defined",
};

describe("Trigger event-script ResRef storage", () => {
  it("freezes the native mapping and admits a complete exact source tuple", () => {
    expect(TRIGGER_SCRIPT_RESREF_FIELDS.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "onDisarm", label: "OnDisarm" },
      { key: "onTrapTriggered", label: "OnTrapTriggered" },
      { key: "onClick", label: "OnClick" },
      { key: "onHeartbeat", label: "ScriptHeartbeat" },
      { key: "onEnter", label: "ScriptOnEnter" },
      { key: "onExit", label: "ScriptOnExit" },
      { key: "onUserDefined", label: "ScriptUserDefine" },
    ]);
    expect(readTriggerScriptResRefsStorage(source)).toEqual(source);
  });

  it("requires complete source storage and lowercase authoring targets", () => {
    expect(readTriggerScriptResRefsTargetStorage({
      ...source,
      onDisarm: "on_disarm",
    })).not.toBeNull();
    expect(readTriggerScriptResRefsTargetStorage(source)).toBeNull();
    expect(readTriggerScriptResRefsStorage({ ...source, onExit: undefined })).toBeNull();
    expect(readTriggerScriptResRefsStorage({ ...source, onExit: "bad-script" })).toBeNull();
    expect(readTriggerScriptResRefsStorage({ ...source, extra: "" })).toBeNull();
  });

  it("gates editing on exact immutable Trigger provenance", () => {
    expect(canEditExistingTriggerScriptResRefs({
      type: "aurora_git",
      sourceKind: "trigger",
      sourceIndex: 0,
      triggerScriptResRefsStorage: source,
    })).toBe(true);
    expect(canEditExistingTriggerScriptResRefs({
      type: "aurora_git",
      sourceKind: "encounter",
      sourceIndex: 0,
      triggerScriptResRefsStorage: source,
    })).toBe(false);
    expect(triggerScriptResRefsStoragesEqual(source, source)).toBe(true);
  });
});
