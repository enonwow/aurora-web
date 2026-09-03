import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  serializeEmptyAreaGic,
  serializeEmptyAreaGit
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-companion-writer";

describe("Aurora Area companion resource writer", () => {
  it("writes the verified empty GIT root lists and native MicroSet/Tiny audio profile", () => {
    const document = parseRawGffDocument(serializeEmptyAreaGit());

    expect(document).toMatchObject({ fileType: "GIT ", rootStructTypeId: 0xffffffff });
    expect(document?.fields.map((field) => field.label)).toEqual([
      "AreaProperties",
      "Creature List",
      "Door List",
      "Encounter List",
      "List",
      "SoundList",
      "StoreList",
      "TriggerList",
      "WaypointList",
      "Placeable List"
    ]);
    expect(document?.fields.find((field) => field.label === "AreaProperties")).toEqual({
      label: "AreaProperties",
      type: "struct",
      value: {
        typeId: 100,
        fields: [
          { label: "AmbientSndDay", type: "int", value: 31 },
          { label: "AmbientSndNight", type: "int", value: 31 },
          { label: "AmbientSndDayVol", type: "int", value: 32 },
          { label: "AmbientSndNitVol", type: "int", value: 32 },
          { label: "EnvAudio", type: "int", value: 0 },
          { label: "MusicBattle", type: "int", value: 34 },
          { label: "MusicDay", type: "int", value: 20 },
          { label: "MusicNight", type: "int", value: 20 },
          { label: "MusicDelay", type: "int", value: 90000 }
        ]
      }
    });
    for (const field of document?.fields.filter((candidate) => candidate.type === "list") ?? []) {
      expect(field).toMatchObject({ type: "list", value: [] });
    }
  });

  it("writes the verified nine-list empty GIC profile", () => {
    const document = parseRawGffDocument(serializeEmptyAreaGic());

    expect(document).toMatchObject({ fileType: "GIC ", rootStructTypeId: 0xffffffff });
    expect(document?.fields).toEqual([
      { label: "Creature List", type: "list", value: [] },
      { label: "Door List", type: "list", value: [] },
      { label: "Encounter List", type: "list", value: [] },
      { label: "List", type: "list", value: [] },
      { label: "SoundList", type: "list", value: [] },
      { label: "StoreList", type: "list", value: [] },
      { label: "TriggerList", type: "list", value: [] },
      { label: "WaypointList", type: "list", value: [] },
      { label: "Placeable List", type: "list", value: [] }
    ]);
  });
});
