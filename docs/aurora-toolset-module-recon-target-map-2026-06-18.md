# Aurora Toolset module recon target map - 2026-06-18

Worker: Worker 2 - Module Recon.

Scope: offline module mapping for live Aurora Toolset atomic-operation tickets. This pass did not touch the live Toolset window, did not send input, and did not modify the module.

## Module path and name trap

Real module path:

`C:\Users\enonw\Documents\Neverwinter Nights\modules\the_last_city — codex.mod`

Important trap: the filename uses U+2014 em dash before `codex`. ASCII-hyphen spellings such as `the_last_city - codex.mod` appear in older docs as labels only and are not the real file path.

Secondary Toolset/resource trap: ERF resrefs are length-limited, so some area resource names are truncated while the ARE display name is longer. Examples from this scan:

| Area resource resref | ARE display/name |
| --- | --- |
| `enon_test_dungeo` | `enon_test_dungeon` |
| `enon_test_bestia` | `enon_test_bestiary` |
| `enon_test_burgla` | `enon_test_burglary` |
| `enon_test_effect` | `enon_test_effects` |
| `enon_test_talent` | `enon_test_talents` |

## Method

Helper script added:

`C:\Projects\aurora-web\.codex-tmp\aurora-atomic-ops\map-module-workflow-targets.ts`

Command used from `C:\Projects\aurora-web\backend`:

```powershell
npx ts-node --project tsconfig.json --transpile-only ../.codex-tmp/aurora-atomic-ops/map-module-workflow-targets.ts
```

Parser sources used read-only:

- `NwnErfPackedModuleExtractorService` for MOD/ERF resource extraction.
- `parseAreaMetadataFromAreGff` and `parseAreaObjectsFromGitGff` for ARE/GIT area facts.
- `parseTemplateBlueprintFromGff` for UTP/UTD/UTC/UTS/UTT template facts where present.
- Minimal local GFF `TriggerList` reader inside the helper because current area parser does not export trigger placements.

Scan result:

- Module resources: 4796.
- ARE resources: 166.
- Targeted areas scanned: 31, including required `_ikea`, `d_und`, `hx_tygiel_under`, `enon_bakery`, `enon_test_build`, plus available `enon_test_*`.
- Candidate counts: 1 inventory placeable, 29 doors with transition fields, 20 positioned sounds, 86 triggers, 108 useful/test creatures.

## Area summary

| Area resref | ARE name | PLC | Inventory PLC | Doors | Transition doors | Sounds | Positioned sounds | Triggers | Creatures |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `_ikea` | `_IKEA` | 1136 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| `d_und` | `d_und` | 228 | 0 | 12 | 12 | 0 | 0 | 84 | 17 |
| `hx_tygiel_under` | `Podtygiel` | 718 | 0 | 7 | 7 | 20 | 20 | 0 | 1 |
| `enon_bakery` | `enon_bakery` | 196 | 0 | 1 | 1 | 0 | 0 | 0 | 0 |
| `enon_test_build` | `enon_test_build` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| `enon_test_cnr` | `enon_test_cnr` | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 |
| `enon_test_dungeo` | `enon_test_dungeon` | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| `enon_test_hub` | `enon_test_hub` | 4 | 0 | 1 | 1 | 0 | 0 | 0 | 0 |
| `enon_test_arena` | `enon_test_arena` | 2 | 0 | 4 | 4 | 0 | 0 | 0 | 0 |
| `enon_test_quest` | `enon_test_quest` | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 53 |

## Best 5 live targets

| Rank | Area | Tag / resref | Type | Why good | Risk | Suggested atom |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `_ikea` | `ZEP_SAFE001` / `zep_safe002` | placeable inventory | Only confirmed `hasInventory=true` placed object in this target scan; UTP display name `Sejf`; position `158.1147,151.2584,5`. | Good read-only properties target, but do not mutate inventory. | Open `_ikea`, Find Instance by tag `ZEP_SAFE001`, Placeable Properties -> Inventory/Basic, Cancel. |
| 2 | `enon_test_cnr` | `cnr_bronze` / `cnr_bronze` | trigger | Test area trigger with 4 geometry points and script `scriptheartbeat:cnr_deposit_spwn`; position `18.385,4.2236,0`. | Trigger shape selection can be fiddly; inspect only, no geometry edits. | Open `enon_test_cnr`, find/select trigger `cnr_bronze`, Trigger Properties -> Basic/Scripts, Cancel. |
| 3 | `hx_tygiel_under` | `StreamCaveMedium` / `streamcavemedium` | sound | Positioned sound, mode `specific`, cutoff radius `15`, max volume distance `1.5`; good radius/positioning target. | Avoid playback/preview; audio can be noisy or policy-gated. | Open `hx_tygiel_under`, select sound `StreamCaveMedium`, Sound Properties -> positioning/radius fields, Cancel. |
| 4 | `enon_bakery` | `enon_bakery_ent` / `nw_door_fancy` | door transition | Simple known area with one door; GIT transition fields: `LinkedTo=wnd_shipyard_baker`, `linkedToFlags=1`, `LoadScreen=0`; position `25,10,0`. | Transition runtime parity is not proven; read fields only. | Open `enon_bakery`, select door `enon_bakery_ent`, Door Properties -> Area Transition, Cancel. |
| 5 | `enon_test_build` | `Kwatermistrz` / `kwatermistrz` | creature | Single creature in required test area; display `Kwatermistrz Steel`; many default script slots are populated; position `41.1262,34.908,0.5078`. | Creature properties are safe for read-only inspection; do not edit scripts. | Open `enon_test_build`, select creature `Kwatermistrz`, Creature Properties -> Basic/Scripts, Cancel. |

## Additional concrete tickets

| Area | Tag / resref | Type | Why good | Risk | Suggested atom |
| --- | --- | --- | --- | --- | --- |
| `d_und` | `d_und_boss_door` / `x3_door_met002` | door transition | Real dungeon transition pair: `LinkedTo=und_boss_exit`, `linkedToFlags=1`, `LoadScreen=0`; position `95,315,0.2`. | Busy area; select by exact tag, not visual guessing. | Door Properties -> Area Transition, read linked target, Cancel. |
| `d_und` | `und_boss_exit` / `nw_door_ttr_14` | door transition | Reverse side of boss-door pair: `LinkedTo=d_und_boss_door`; position `56,55.64,-6`. | Same transition parity blocker; no runtime traversal. | Door Properties -> Area Transition, compare pair, Cancel. |
| `d_und` | `d_und_t_left_0` / `newgeneric` | trigger | One of many `d_und` triggers; 4 geometry points, position around `39.578,134.9245,0`; useful for trigger UI discovery. | Tag is duplicated across several instances; use position/index evidence and avoid geometry edits. | Trigger Properties -> Basic/Scripts, Cancel. |
| `hx_tygiel_under` | `hx_undertyg_woda2` / `nw_door_ttr_01` | door transition | Transition with `LinkedTo=hx_undertyg_woda1`, `linkedToFlags=2`, `LoadScreen=0`; position `75.66,14.75,1.75`. | Different flag value may expose UI option differences; read only. | Door Properties -> Area Transition, record flags/options, Cancel. |
| `hx_tygiel_under` | `sound_ut_glut` / `sewergloops` | sound | Random-position sound, cutoff `12`, max volume `1.2`, random range `10x10`; good contrast against specific-position sound. | Do not trigger playback; inspect positioning/radius only. | Sound Properties -> positioning/random range fields, Cancel. |
| `hx_tygiel_under` | `Fireplace` / `fireplace` | sound | Specific-position sound, cutoff `10`, max volume `1`; recognizable environmental sound target. | Same audio/noise risk. | Sound Properties -> position/radius fields, Cancel. |
| `hx_tygiel_under` | `hx_undertyg_prze1` / `nw_door_ttr_01` | door transition | Transition pair to `hx_undertyg_prze2`; `linkedToFlags=1`, `LoadScreen=0`; position `40,5,1`. | Pair verification only; do not traverse. | Door Properties -> Area Transition, compare against `hx_undertyg_prze2`, Cancel. |
| `enon_test_hub` | `Wall1Gate` / `nw_door_ttr_01` | door transition | Small test area with one door; `LinkedTo=Breach`, `linkedToFlags=1`; position `20,5,0`. | Easier than dense areas, but tag may also be referenced by other doors. | Door Properties -> Area Transition, Cancel. |
| `enon_test_dungeo` | `entrance_enon_test_dungeon` / `nw_door_ttr_27` | door transition | Truncated resource resref maps to ARE name `enon_test_dungeon`; `LinkedTo=Wall1Gate`; position `14.72,28.37,0`. | Use resource resref `enon_test_dungeo` if needed; UI may show full ARE name. | Door Properties -> Area Transition, Cancel. |
| `enon_test_ads` | `herald` / `herald` | creature | Test creature with custom heartbeat `lib_ads_herald` plus standard scripts; position `24.972,25.0286,0.7548`. | Creature scripts should be read only. | Creature Properties -> Scripts, Cancel. |
| `enon_test_ads` | `npc_noticeboard` / `npc_noticeboard` | creature | Test creature with dialog script `test_ads`; good conversation/script-property target. | Display name has mojibake in parser output, so rely on tag/resref. | Creature Properties -> Basic/Scripts, Cancel. |
| `enon_test_arena` | `BridgeDoor` / `nw_door_ttr_06` | door transition | Four duplicate bridge doors in a small test area, all with transition payload placeholders; good duplicate-tag behavior target. | Duplicate tag; identify by position before opening properties. | Select one `BridgeDoor`, Door Properties -> Area Transition, Cancel. |

## Notes for live operator

- Prefer these tickets over browsing the module tree manually.
- For duplicated tags (`BridgeDoor`, many `d_und_t_left_0` triggers), capture the area and approximate position before opening properties.
- For sounds, keep the atom to properties/radius/positioning. Do not use preview/playback unless explicitly requested.
- For all tickets, the safe closeout is `Cancel`, not `OK`.
