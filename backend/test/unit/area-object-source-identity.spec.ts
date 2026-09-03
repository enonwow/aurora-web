import {
  enumerateAreaObjectSources,
} from "../../src/modules/areas/domain/area-object-source-identity";

describe("Area object source identity", () => {
  it("allocates deterministic IDs in the production projection family order", () => {
    const sources = enumerateAreaObjectSources({
      placeables: [{ tag: "Shared Tag", templateResRef: "plc_chest" }],
      doors: [{ tag: "Shared Tag", templateResRef: "door_01" }],
      creatures: [{ tag: "Shared Tag", templateResRef: "nw_guard" }],
      encounters: [{ tag: "Encounter One" }],
      items: [{ templateResRef: "NW-SWORD" }],
      sounds: [{ tag: "Sound One" }],
      stores: [{ tag: "Store One" }],
      triggers: [{ tag: "Trigger One" }],
      waypoints: [{ tag: "" }],
    });

    expect(sources.map(({ kind, sourceIndex, sourceObjectId }) => ({
      kind,
      sourceIndex,
      sourceObjectId,
    }))).toEqual([
      { kind: "placeable", sourceIndex: 0, sourceObjectId: "obj_plc_shared_tag" },
      { kind: "door", sourceIndex: 0, sourceObjectId: "obj_dr_shared_tag" },
      { kind: "creature", sourceIndex: 0, sourceObjectId: "obj_cre_shared_tag" },
      { kind: "encounter", sourceIndex: 0, sourceObjectId: "obj_enc_encounter_one" },
      { kind: "item", sourceIndex: 0, sourceObjectId: "obj_itm_nw-sword" },
      { kind: "sound", sourceIndex: 0, sourceObjectId: "obj_snd_sound_one" },
      { kind: "store", sourceIndex: 0, sourceObjectId: "obj_sto_store_one" },
      { kind: "trigger", sourceIndex: 0, sourceObjectId: "obj_trg_trigger_one" },
      { kind: "waypoint", sourceIndex: 0, sourceObjectId: "obj_wpt_entry_1" },
    ]);
  });

  it("disambiguates duplicate and truncated tokens without time-dependent fallbacks", () => {
    const longTag = "A".repeat(100);
    const first = enumerateAreaObjectSources({
      placeables: Array.from({ length: 16 }, () => ({ tag: longTag })),
      doors: [], creatures: [], encounters: [], items: [], sounds: [], stores: [], triggers: [], waypoints: [],
    });
    const second = enumerateAreaObjectSources({
      placeables: Array.from({ length: 16 }, () => ({ tag: longTag })),
      doors: [], creatures: [], encounters: [], items: [], sounds: [], stores: [], triggers: [], waypoints: [],
    });

    expect(new Set(first.map((entry) => entry.sourceObjectId)).size).toBe(first.length);
    expect(first.map((entry) => entry.sourceObjectId)).toEqual(
      second.map((entry) => entry.sourceObjectId),
    );
    expect(first.at(-1)?.sourceObjectId.length).toBeLessThanOrEqual(80);
    expect(first[0]?.sourceObjectId).toBe(`obj_plc_${"a".repeat(64)}`);
    expect(first[15]?.sourceObjectId).toBe(`obj_plc_${"a".repeat(64)}_16`);
  });

  it("normalizes surrounding whitespace and every unsupported Unicode code point", () => {
    const [entry] = enumerateAreaObjectSources({
      placeables: [{ tag: "  TAG🙂/A  " }],
      doors: [], creatures: [], encounters: [], items: [], sounds: [], stores: [], triggers: [], waypoints: [],
    });
    expect(entry?.sourceObjectId).toBe("obj_plc_tag_a");
  });

  it("skips IDs already occupied by another normalized source token", () => {
    const entries = enumerateAreaObjectSources({
      placeables: [{ tag: "same" }, { tag: "same_2" }, { tag: "same" }, { tag: "same" }],
      doors: [], creatures: [], encounters: [], items: [], sounds: [], stores: [], triggers: [], waypoints: [],
    });
    expect(entries.map((entry) => entry.sourceObjectId)).toEqual([
      "obj_plc_same",
      "obj_plc_same_2",
      "obj_plc_same_3",
      "obj_plc_same_4",
    ]);
  });
});
