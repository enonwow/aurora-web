import { describe, expect, it } from "vitest";

import {
  CREATURE_SCRIPT_RESREF_FIELDS,
  isCreatureScriptSourceResRef,
  isCreatureScriptTargetResRef,
  readCreatureScriptResRefsProvenance,
  readCreatureScriptResRefsStorage,
} from "../../../../../src/modules/scene/domain/creatureScriptResRefs";

const absentStorage = Object.freeze({
  onHeartbeat: { present: false },
  onPerception: { present: false },
  onSpellCastAt: { present: false },
  onPhysicalAttacked: { present: false },
  onDamaged: { present: false },
  onDisturbed: { present: false },
  onCombatRoundEnd: { present: false },
  onConversation: { present: false },
  onSpawn: { present: false },
  onRested: { present: false },
  onDeath: { present: false },
  onUserDefined: { present: false },
  onBlocked: { present: false },
});

describe("Creature script ResRefs", () => {
  it("freezes the exact Aurora event-to-native-label order", () => {
    expect(CREATURE_SCRIPT_RESREF_FIELDS).toEqual([
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
    expect(Object.isFrozen(CREATURE_SCRIPT_RESREF_FIELDS)).toBe(true);
  });

  it.each(["", "NW_C2_DEFAULT1", "nw_c2_default9", "a".repeat(16)])(
    "admits bounded source ResRef %#",
    (value) => expect(isCreatureScriptSourceResRef(value)).toBe(true),
  );

  it.each(["", "main", "spawn_probe", "a".repeat(16)])(
    "admits canonical target ResRef %#",
    (value) => expect(isCreatureScriptTargetResRef(value)).toBe(true),
  );

  it.each(["bad-resref", "a".repeat(17), "main.nss", 3, null])(
    "rejects malformed source ResRef %#",
    (value) => expect(isCreatureScriptSourceResRef(value)).toBe(false),
  );

  it.each(["MAIN", "bad-resref", "a".repeat(17), 3, null])(
    "rejects noncanonical target ResRef %#",
    (value) => expect(isCreatureScriptTargetResRef(value)).toBe(false),
  );

  it("reads one exact presence-sensitive thirteen-member storage group", () => {
    const storage = readCreatureScriptResRefsStorage({
      ...absentStorage,
      onHeartbeat: { present: true, nativeType: "resref", value: "NW_C2_DEFAULT1" },
      onSpawn: { present: true, nativeType: "resref", value: "" },
    });
    expect(storage?.onHeartbeat).toEqual({
      present: true,
      nativeType: "resref",
      value: "NW_C2_DEFAULT1",
    });
    expect(storage?.onSpawn).toEqual({ present: true, nativeType: "resref", value: "" });
    expect(storage?.onDeath).toEqual({ present: false });
    expect(Object.isFrozen(storage)).toBe(true);
    expect(readCreatureScriptResRefsStorage({
      ...absentStorage,
      onSpawn: { present: true, nativeType: "cexostring", value: "main" },
    })).toBeNull();
    const { onBlocked: _removed, ...incomplete } = absentStorage;
    expect(readCreatureScriptResRefsStorage(incomplete)).toBeNull();
  });

  it("reads a non-empty exact present-member provenance subset", () => {
    const provenance = readCreatureScriptResRefsProvenance({
      onHeartbeat: { expectedResRef: "NW_C2_DEFAULT1" },
      onSpawn: { expectedResRef: "" },
    });
    expect(provenance).toEqual({
      onHeartbeat: { expectedResRef: "NW_C2_DEFAULT1" },
      onSpawn: { expectedResRef: "" },
    });
    expect(Object.isFrozen(provenance?.onHeartbeat)).toBe(true);
    expect(readCreatureScriptResRefsProvenance({})).toBeNull();
    expect(readCreatureScriptResRefsProvenance({
      onSpawn: { expectedResRef: "main" },
      extra: true,
    })).toBeNull();
    expect(readCreatureScriptResRefsProvenance({
      onSpawn: { expectedResRef: "bad-resref" },
    })).toBeNull();
  });
});
