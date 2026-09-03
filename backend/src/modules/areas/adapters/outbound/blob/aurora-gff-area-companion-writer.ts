import {
  buildGffBuffer,
  type SupportedGffField
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const ROOT_STRUCT_TYPE_ID = 0xffffffff;
const AREA_PROPERTIES_STRUCT_TYPE_ID = 100;

const EMPTY_AREA_OBJECT_LIST_LABELS = [
  "Creature List",
  "Door List",
  "Encounter List",
  "List",
  "SoundList",
  "StoreList",
  "TriggerList",
  "WaypointList",
  "Placeable List"
] as const;

/**
 * The exact empty GIT companion profile captured by AUR-S05-05 for the
 * Toolset MicroSet/Tiny creation route. Keep this profile versioned and narrow:
 * these audio values are native evidence for that route, not a global tileset
 * default inferred by the application.
 */
export function serializeEmptyAreaGit(): Buffer {
  const areaProperties: SupportedGffField[] = [
    { label: "AmbientSndDay", type: "int", value: 31 },
    { label: "AmbientSndNight", type: "int", value: 31 },
    { label: "AmbientSndDayVol", type: "int", value: 32 },
    { label: "AmbientSndNitVol", type: "int", value: 32 },
    { label: "EnvAudio", type: "int", value: 0 },
    { label: "MusicBattle", type: "int", value: 34 },
    { label: "MusicDay", type: "int", value: 20 },
    { label: "MusicNight", type: "int", value: 20 },
    { label: "MusicDelay", type: "int", value: 90000 }
  ];
  return buildGffBuffer(
    [
      {
        label: "AreaProperties",
        type: "struct",
        value: { typeId: AREA_PROPERTIES_STRUCT_TYPE_ID, fields: areaProperties }
      },
      ...buildEmptyObjectLists()
    ],
    "GIT ",
    ROOT_STRUCT_TYPE_ID
  );
}

/**
 * Native GIC companions maintain one comment-list lane for each GIT object
 * family. Empty Areas still serialize all nine root lists.
 */
export function serializeEmptyAreaGic(): Buffer {
  return buildGffBuffer(buildEmptyObjectLists(), "GIC ", ROOT_STRUCT_TYPE_ID);
}

function buildEmptyObjectLists(): SupportedGffField[] {
  return EMPTY_AREA_OBJECT_LIST_LABELS.map((label) => ({
    label,
    type: "list" as const,
    value: []
  }));
}
