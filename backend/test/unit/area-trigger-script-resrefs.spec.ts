import {
  AREA_TRIGGER_SCRIPT_RESREF_FIELDS,
  areaTriggerScriptResRefsStoragesEqual,
  readAreaTriggerScriptResRefsStorage,
  readAreaTriggerScriptResRefsTargetStorage,
  readExistingAreaTriggerScriptResRefsMutation,
} from "../../src/modules/areas/domain/area-trigger-script-resrefs";

const source = Object.freeze({
  onDisarm: "On_Disarm",
  onTrapTriggered: "on_trap",
  onClick: "",
  onHeartbeat: "heartbeat_01",
  onEnter: "on_enter",
  onExit: "on_exit",
  onUserDefined: "user_defined",
});

describe("existing Area Trigger event-script tuple contract", () => {
  it("freezes the exact native field mapping", () => {
    expect(AREA_TRIGGER_SCRIPT_RESREF_FIELDS).toEqual([
      { key: "onDisarm", label: "OnDisarm" },
      { key: "onTrapTriggered", label: "OnTrapTriggered" },
      { key: "onClick", label: "OnClick" },
      { key: "onHeartbeat", label: "ScriptHeartbeat" },
      { key: "onEnter", label: "ScriptOnEnter" },
      { key: "onExit", label: "ScriptOnExit" },
      { key: "onUserDefined", label: "ScriptUserDefine" },
    ]);
  });

  it("admits one complete exact source tuple including empty and mixed-case ResRefs", () => {
    const admitted = readAreaTriggerScriptResRefsStorage(source);
    expect(admitted).toEqual(source);
    expect(Object.isFrozen(admitted)).toBe(true);
  });

  it.each([
    ["partial", { ...source, onDisarm: undefined }],
    ["unexpected key", { ...source, extra: "" }],
    ["over budget", { ...source, onDisarm: "a".repeat(17) }],
    ["invalid character", { ...source, onDisarm: "bad-script" }],
  ])("rejects %s source storage", (_label, value) => {
    expect(readAreaTriggerScriptResRefsStorage(value)).toBeNull();
  });

  it("requires lowercase authoring targets", () => {
    expect(readAreaTriggerScriptResRefsTargetStorage({
      ...source,
      onDisarm: "on_disarm",
    })).not.toBeNull();
    expect(readAreaTriggerScriptResRefsTargetStorage(source)).toBeNull();
  });

  it("admits only one complete changed compare-and-swap tuple", () => {
    const target = { ...source, onDisarm: "on_disarm", onExit: "new_exit" };
    const mutation = readExistingAreaTriggerScriptResRefsMutation({
      expectedValue: source,
      value: target,
    });
    expect(mutation).toEqual({ expectedValue: source, value: target });
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(areaTriggerScriptResRefsStoragesEqual(source, source)).toBe(true);
    expect(areaTriggerScriptResRefsStoragesEqual(source, target)).toBe(false);
    expect(readExistingAreaTriggerScriptResRefsMutation({
      expectedValue: source,
      value: source,
    })).toBeNull();
  });
});
