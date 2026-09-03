import {
  AREA_CREATURE_SCRIPT_RESREF_FIELDS,
  isAreaCreatureScriptSourceResRef,
  isAreaCreatureScriptTargetResRef,
  readAreaCreatureScriptResRefStorage,
  readAreaCreatureScriptResRefsStorage,
  readExistingAreaCreatureScriptResRefMutations,
} from "../../src/modules/areas/domain/area-creature-script-resrefs";

const exactStorage = Object.fromEntries(
  AREA_CREATURE_SCRIPT_RESREF_FIELDS.map(({ key }, index) => [
    key,
    index === 8
      ? { present: false }
      : { present: true, nativeType: "resref", value: index === 0 ? "NW_C2_DEFAULT1" : "" },
  ]),
);

describe("Existing Area Creature script ResRefs domain", () => {
  it("freezes the exact thirteen canonical frontend/native mappings", () => {
    expect(AREA_CREATURE_SCRIPT_RESREF_FIELDS).toEqual([
      { key: "onHeartbeat", nativeLabel: "ScriptHeartbeat" },
      { key: "onPerception", nativeLabel: "ScriptOnNotice" },
      { key: "onSpellCastAt", nativeLabel: "ScriptSpellAt" },
      { key: "onPhysicalAttacked", nativeLabel: "ScriptAttacked" },
      { key: "onDamaged", nativeLabel: "ScriptDamaged" },
      { key: "onDisturbed", nativeLabel: "ScriptDisturbed" },
      { key: "onCombatRoundEnd", nativeLabel: "ScriptEndRound" },
      { key: "onConversation", nativeLabel: "ScriptDialogue" },
      { key: "onSpawn", nativeLabel: "ScriptSpawn" },
      { key: "onRested", nativeLabel: "ScriptRested" },
      { key: "onDeath", nativeLabel: "ScriptDeath" },
      { key: "onUserDefined", nativeLabel: "ScriptUserDefine" },
      { key: "onBlocked", nativeLabel: "ScriptOnBlocked" },
    ]);
    expect(Object.isFrozen(AREA_CREATURE_SCRIPT_RESREF_FIELDS)).toBe(true);
    expect(AREA_CREATURE_SCRIPT_RESREF_FIELDS.every(Object.isFrozen)).toBe(true);
  });

  it("separates source-compatible ResRefs from canonical writable targets", () => {
    expect(isAreaCreatureScriptSourceResRef("NW_C2_DEFAULT1")).toBe(true);
    expect(isAreaCreatureScriptSourceResRef("")).toBe(true);
    expect(isAreaCreatureScriptTargetResRef("nw_c2_default1")).toBe(true);
    expect(isAreaCreatureScriptTargetResRef("")).toBe(true);
    for (const value of ["has-dash", "x".repeat(17), "zażółć", 1]) {
      expect(isAreaCreatureScriptSourceResRef(value)).toBe(false);
      expect(isAreaCreatureScriptTargetResRef(value)).toBe(false);
    }
    expect(isAreaCreatureScriptTargetResRef("NW_C2_DEFAULT1")).toBe(false);
  });

  it("reads exact presence-sensitive native member storage", () => {
    const absent = readAreaCreatureScriptResRefStorage({ present: false });
    const present = readAreaCreatureScriptResRefStorage({
      present: true,
      nativeType: "resref",
      value: "NW_C2_DEFAULT1",
    });
    expect(absent).toEqual({ present: false });
    expect(present).toEqual({
      present: true,
      nativeType: "resref",
      value: "NW_C2_DEFAULT1",
    });
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(present)).toBe(true);
  });

  it.each([
    { present: false, value: "" },
    { present: true, nativeType: "cexostring", value: "main" },
    { present: true, nativeType: "resref", value: "bad-resref" },
    { present: true, nativeType: "resref", value: "main", extra: true },
  ])("rejects malformed member storage %#", (candidate) => {
    expect(readAreaCreatureScriptResRefStorage(candidate)).toBeNull();
  });

  it("reads one exact detached thirteen-member storage group", () => {
    const parsed = readAreaCreatureScriptResRefsStorage(exactStorage);
    expect(parsed).toEqual(exactStorage);
    expect(parsed).not.toBe(exactStorage);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(parsed && Object.values(parsed).every(Object.isFrozen)).toBe(true);
    expect(readAreaCreatureScriptResRefsStorage({ ...exactStorage, extra: { present: false } }))
      .toBeNull();
    const { onBlocked: _missing, ...partial } = exactStorage;
    expect(readAreaCreatureScriptResRefsStorage(partial)).toBeNull();
  });

  it("reads unique mutations only in canonical native-field order", () => {
    const parsed = readExistingAreaCreatureScriptResRefMutations([
      { field: "ScriptHeartbeat", expectedResRef: "NW_C2_DEFAULT1", resRef: "main" },
      { field: "ScriptSpawn", expectedResRef: "", resRef: "spawn_probe" },
    ]);
    expect(parsed).toEqual([
      { field: "ScriptHeartbeat", expectedResRef: "NW_C2_DEFAULT1", resRef: "main" },
      { field: "ScriptSpawn", expectedResRef: "", resRef: "spawn_probe" },
    ]);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(parsed?.every(Object.isFrozen)).toBe(true);
  });

  it.each([
    [[]],
    [[{ field: "ScriptSpawn", expectedResRef: "same", resRef: "same" }]],
    [[{ field: "ScriptSpawn", expectedResRef: "", resRef: "UPPER" }]],
    [[{ field: "scriptspawn", expectedResRef: "", resRef: "main" }]],
    [[
      { field: "ScriptSpawn", expectedResRef: "", resRef: "main" },
      { field: "ScriptSpawn", expectedResRef: "", resRef: "other" },
    ]],
    [[
      { field: "ScriptSpawn", expectedResRef: "", resRef: "main" },
      { field: "ScriptHeartbeat", expectedResRef: "old", resRef: "new" },
    ]],
    [[{ field: "ScriptSpawn", expectedResRef: "", resRef: "main", extra: true }]],
  ])("rejects empty, malformed, duplicated, or noncanonical mutation arrays %#", (candidate) => {
    expect(readExistingAreaCreatureScriptResRefMutations(candidate)).toBeNull();
  });
});
