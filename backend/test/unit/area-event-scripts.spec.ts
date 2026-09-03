import {
  AREA_EVENT_SCRIPT_FIELDS,
  isAreaEventScriptResRef,
  readExistingAreaEventScriptMutations,
} from "../../src/modules/areas/domain/area-event-scripts";

describe("existing Area event script contract", () => {
  it("freezes the exact Aurora field order", () => {
    expect(AREA_EVENT_SCRIPT_FIELDS).toEqual([
      { slot: "onEnter", field: "OnEnter" },
      { slot: "onExit", field: "OnExit" },
      { slot: "onHeartbeat", field: "OnHeartbeat" },
      { slot: "onUserDefined", field: "OnUserDefined" },
    ]);
    expect(Object.isFrozen(AREA_EVENT_SCRIPT_FIELDS)).toBe(true);
  });

  it.each(["", "area_enter", "a", "x".repeat(16)])(
    "admits canonical ResRef %j",
    (value) => expect(isAreaEventScriptResRef(value)).toBe(true),
  );

  it.each(["Area_Enter", "has space", "bad-", "x".repeat(17), "nul\0ref"])(
    "rejects non-canonical ResRef %j",
    (value) => expect(isAreaEventScriptResRef(value)).toBe(false),
  );

  it("reads an ordered, changed, exact CAS mutation map", () => {
    expect(readExistingAreaEventScriptMutations({
      onEnter: { expectedResRef: "old_enter", resRef: "new_enter" },
      onUserDefined: { expectedResRef: "", resRef: "area_user" },
    })).toEqual({
      onEnter: { expectedResRef: "old_enter", resRef: "new_enter" },
      onUserDefined: { expectedResRef: "", resRef: "area_user" },
    });
  });

  it.each([
    {},
    { onEnter: { expectedResRef: "same", resRef: "same" } },
    { onEnter: { expectedResRef: "old", resRef: "Bad" } },
    { OnEnter: { expectedResRef: "old", resRef: "new" } },
    { onEnter: { expectedResRef: "old", resRef: "new", extra: true } },
  ])("rejects malformed mutation input %#", (value) => {
    expect(readExistingAreaEventScriptMutations(value)).toBeNull();
  });
});
