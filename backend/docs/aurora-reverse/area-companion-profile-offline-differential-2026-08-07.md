# Area GIT/GIC companion profile offline differential - 2026-08-07

## Purpose

Record the primary/native evidence used to correct Aurora Web's empty Area GIT
and GIC writers without extending the claim to unresolved New Area ARE defaults,
`PathConnect`, Toolset acceptance of application bytes, or NWN runtime behavior.

## Evidence

### Accepted New Area proof

The accepted AUR-S05-05 `MicroSet` / `Tiny` proof records:

- Area ResRef `area002`, tileset `tms01`, dimensions 2x2;
- GIT size 724 bytes, two structs, 19 fields and 19 labels;
- zero objects in all nine object families;
- ambient day/night 31/31;
- ambient day/night volume 32/32;
- environment audio 0;
- music day/night/battle 20/20/34;
- music delay 90000;
- GIC size 392 bytes, one struct, nine fields and nine labels.

Sources:

- `backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-05-new-area/validation.json`;
- `backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-05-new-area/area002-after-create-save/raw.git.summary.json`;
- `backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-05-new-area/area002-after-create-save/raw.gic.status.json`.

### Independent packed-module structural readback

A read-only ERF/GFF inspection was run against:

- module: `C:/Users/enonw/Documents/Neverwinter Nights/modules/s05e0717.mod`;
- module SHA-256:
  `2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`;
- Areas: `area`, `area001`, and `demo`.

No Toolset or NWN process was started and no module or evidence file was
mutated. The existing repository ERF/GFF reader was used to enumerate root
labels, field types, struct types, and list counts.

All three GIT resources contain these root fields:

1. `AreaProperties` as struct type 100;
2. `Creature List`;
3. `Door List`;
4. `Encounter List`;
5. `List`;
6. `SoundList`;
7. `StoreList`;
8. `TriggerList`;
9. `WaypointList`;
10. `Placeable List`.

Every `AreaProperties` struct contains nine `INT` fields:

1. `AmbientSndDay`;
2. `AmbientSndNight`;
3. `AmbientSndDayVol`;
4. `AmbientSndNitVol`;
5. `EnvAudio`;
6. `MusicBattle`;
7. `MusicDay`;
8. `MusicNight`;
9. `MusicDelay`.

All three GIC resources contain exactly the same nine root list labels as the
GIT object-family lists, with no `AreaProperties`:

1. `Creature List`;
2. `Door List`;
3. `Encounter List`;
4. `List`;
5. `SoundList`;
6. `StoreList`;
7. `TriggerList`;
8. `WaypointList`;
9. `Placeable List`.

Their list cardinalities match the corresponding GIT object-family list
cardinalities for every inspected Area. This independently confirms that the
GIC nine fields are object-family comment lanes and that the placed ground-item
label is `List`, not the inventory vocabulary `ItemList`.

Representative resource hashes:

| Area | Resource | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `area` | GIT | 2,974 | `ce6864ad7064742f145989edb8ed935f66985c46cb1c93cfd52d81ae0a188acd` |
| `area` | GIC | 1,098 | `29c6837d3d05bfa2721794b074ae1c932fe83966e4ab89972601cfc7877b9c26` |
| `area001` | GIT | 2,581 | `85a408ab6e3acf98d069e91a4e8725199ba849df4a650086ad2a6a992f0c0e5c` |
| `area001` | GIC | 455 | `e9210214482000632ebee7933fab157084b9e04fa9ac1f7b4a207c5beb1c71e7` |
| `demo` | GIT | 108,913 | `a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613` |
| `demo` | GIC | 1,730 | `535d1ab4a0c1c22795b867e225437506dd20a905ede1f98e85aa1efcdc61c26d` |

The same read-only pass also checked the serialized GFF types needed by the
independent candidate validator. In each of `area`, `area001`, and `demo`,
`Width`, `Height`, `Tile_ID`, `Tile_Orientation`, and `Tile_Height` are GFF
`INT` fields; `Version` is `DWORD`; and `Tile_AnimLoop1` is a `BYTE` with value
1 on the inspected first tile. The earlier decompilation note describing the
three tile scalars as “dword” concerns the native scalar/storage width and must
not be interpreted as the serialized GFF field type. The packed native bytes
are authoritative for this narrow GFF-type differential.

## Implementation decision

The following narrow changes are evidence-backed:

1. emit the canonical GIT ground-item root list as `List`;
2. emit all nine empty GIT object-family lists;
3. emit `AreaProperties` as struct type 100 with the nine exact AUR-S05-05
   `MicroSet` / `Tiny` integer values;
4. emit all nine empty GIC object-family lists;
5. keep this companion profile narrow and versionable instead of describing its
   audio values as universal defaults.
6. serialize Area dimensions and the three per-tile scalar fields as GFF
   `INT`, preserve source byte values when an editing request omits them, and
   use animation-loop value 1 only for genuinely new profile tiles.

The implementation lives in
`backend/src/modules/areas/adapters/outbound/blob/aurora-gff-area-companion-writer.ts`.

## Remaining boundaries

This evidence does not close:

- the exact 43-field New Area ARE initialization values;
- arbitrary tileset/size blank-tile selection or orientation;
- animation-loop defaults outside the exact AUR-S05-05 sample;
- application-generated resource acceptance by Toolset Save/Build;
- packed application readback after Toolset normalization;
- NWN load or traversability;
- native `PathConnect` or WOK connection semantics.

Those proof points remain `missing`. The application must not use this
companion-resource correction alone to claim complete Area creation parity.
