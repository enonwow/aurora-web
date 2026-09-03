# Existing Area Creature property-matrix audit v1

Date: 2026-09-02  
Status: native control/storage matrix classified; admitted retained-instance
profiles are implemented and offline-verified; coupled race/CR, arbitrary
class-spell, localized-string, dynamic-construction, and live proof gates remain
open

## Decision

The catalog blocker `remaining_creature_property_matrix_incomplete` is no
longer precise. The frozen `TDLGCREATUREEDIT` form and the complete common plus
placed-Creature GFF reader/writer lineage can now be accounted for without an
unclassified ordinary retained-instance property.

Aurora Web already implements presence-sensitive compare-and-swap profiles for
the source-closed retained fields listed below. Unsupported source shapes stay
visible as `PRESERVE_ONLY`; an absent field is never synthesized. This audit
does not promote Creature authoring to complete. It replaces one vague blocker
with the exact remaining implementation gates:

1. `creature_race_cr_derived_calculators_pending`;
2. `creature_dynamic_template_construction_pending`;
3. `creature_full_localized_string_editor_pending`;
4. `creature_class_arbitrary_spell_graph_mutation_incomplete`.

The existing browser, Toolset Save/Build/reopen, packed-readback, renderer, and
NWN runtime blockers remain unchanged.

## Immutable primary authority

This classification inspected only read-only local authority:

- `C:/Projects/New Folder/export/decompiled_all.c`, 30,366,020 bytes, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
  12,201,984 bytes, SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`;
- the frozen 52,662-byte `TDLGCREATUREEDIT` `TPF0` resource at RVA
  `0x00AE4698`, SHA-256
  `75e2dcfd5b0886dbb13bfb7cb32290ccce842cada84cfb806510abde52e7820e`.

No xoreos or other GPL source was inspected or used. This audit started no
Docker/container, service, watcher, browser, Chrome, Toolset, NWN, capture,
mutation-test, or sub-agent process.

## Native storage boundary

The complete common Creature reader/writer is `FUN_00532174` /
`FUN_0053521c`, beginning at decompiled lines `193907` and `195081`. The
retained type-`4` Area wrappers are `FUN_0053ab24` / `FUN_0053ae80`; they own
position/orientation and paired-GIC `Comment`, delegate the common Creature
record, then delegate inventory/equipment through `FUN_0052a668` /
`FUN_0052b55c`.

The common lineage is exhaustive for the ordinary stored Creature record. It
also proves that a visible calculated label or dialog command is not an
independent GIT member. Conversely, `IsPC` is native storage retained by Area
instances but has no ordinary authoring control in the frozen Creature form;
it is not a missing checkbox mutation.

## Exhaustive control and persistence matrix

| Native UI group/control | Native persisted member | Aurora Web offline disposition |
| --- | --- | --- |
| First/Last Name, Description | `FirstName`, `LastName`, `Description : CExoLocString` | Implemented for the exact bounded inline language-0 printable-ASCII profile; complete language/gender, code-page, TLK, duplicate/empty-entry, and ordered entry editing remains blocked |
| Race | `Race : Byte` plus race-dependent editor calculations | Retained and used as immutable dependency by HP and Portrait profiles; direct mutation remains blocked until the complete native race-change recalculation is source-closed |
| Phenotype | `Phenotype : Byte` | Implemented against the effective phenotype catalog |
| Gender | `Gender : Byte` | Implemented against exact effective `gender.2da` provenance |
| Appearance | `Appearance_Type : Word` | Implemented against exact effective `appearance.2da` provenance |
| Tag | `Tag : CExoString` | Implemented by immutable Creature ordinal and exact expected/target pair |
| Challenge Rating | `ChallengeRating : Float` | Implemented as exact retained binary32 CAS; it is independent from the blocked native recalculation workflow |
| Portrait | canonical `PortraitId : Word` | Implemented with exact `portraits.2da`, Gender, and Race provenance; legacy `Portrait : ResRef` is not written |
| Conversation / No Interrupt | `Conversation : ResRef`, inverse of `Interruptable : Byte` | Implemented independently and presence-sensitively |
| Ability Scores | `Str`, `Dex`, `Con`, `Int`, `Wis`, `Cha : Byte` | Implemented as exact base values; racial modifiers and totals are derived views |
| Natural AC | `NaturalAC : Byte` | Implemented in the lossless `0..255` storage range; calculated AC labels are derived views |
| Saving Throw Bonus | `fortbonus`, `refbonus`, `willbonus : Short` | Implemented; base/racial/total labels remain derived views |
| Base/Current/Total HP | `HitPoints`, `CurrentHitPoints`, `MaxHitPoints : Short` | Implemented as one coupled profile with Constitution, Race, class-level, feat-40, and `racialtypes.2da` provenance |
| Movement Rate | `WalkRate : Int` | Implemented with the native `creaturespeed.2da` plus `appearance.2da` binding |
| Body/head selectors | 18 compatibility body slots plus `Appearance_Head` | Implemented while preserving byte-only, word-only, and paired physical shapes; direct Creature robe storage is correctly excluded |
| Color | `Color_Skin`, `Color_Hair`, `Color_Tattoo1`, `Color_Tattoo2 : Byte` | Implemented independently and presence-sensitively |
| Wings / Tail | `Wings_New`, `Tail_New : DWord` | Implemented with exact effective table provenance; legacy Byte siblings remain preserved |
| Alignment | `GoodEvil`, `LawfulChaotic : Byte` | Implemented as one canonical coupled pair |
| Classes / levels | `ClassList : List` | Implemented for same-roster identity/level edits and proven tail resize; class changes clear affected known/memorized spell subgraphs |
| Package | `StartingPackage : Byte` | Implemented against the effective packages catalog and retained class context |
| Skills | `SkillList : List` | Implemented as complete exact ordinal-vector CAS |
| Feats | `FeatList : List` | Implemented as a complete table-bound ordered profile |
| Spells | per-class known/memorized spell lists inside `ClassList` | Arbitrary graph authoring remains blocked; only the proven clear-on-class-change behavior is implemented |
| Special Abilities | `SpecAbilityList : List` | Implemented for canonical exact entries with effective `spells.2da` provenance; opaque/noncanonical sources remain preserved |
| Scripts | thirteen canonical `Script* : ResRef` members | Implemented independently and presence-sensitively |
| Blueprint ResRef | `TemplateResRef : ResRef` | Implemented for exact retained storage; it does not change the underlying UTC catalog identity |
| Corpse / advanced flags | `BodyBag`, `DecayTime`, `Lootable`, `Disarmable`, `Plot`, `NoPermDeath`, `IsImmortal` | Implemented according to their independent or coupled native profiles |
| Faction | `FactionID : Word` | Implemented with exact module `repute.fac` physical-ordinal provenance |
| CR adjustment | `CRAdjust : Int` and Toolset-recomputed `ChallengeRating` | Blocked until the complete `FUN_0052ede0` calculator and its table/feat/spell dependencies are implemented atomically |
| Subrace / Deity | `Subrace`, `Deity : CExoString` | Implemented independently and presence-sensitively |
| Sound Set | `SoundSetFile : Word` | Implemented against exact effective `soundset.2da` provenance |
| Perception Range | `PerceptionRange : Byte` | Implemented against exact effective `ranges.2da` provenance |
| Variables | `VarTable : List` | Implemented as exact ordered variable-table CRUD |
| Comments | ordinal-paired GIC `Comment : CExoString` | Implemented without changing gameplay GIT storage |
| Inventory | `ItemList : List` | Retained ordered CRUD and the admitted blueprint-add profile are implemented; wider arbitrary nested Item authoring remains in the separate inventory/equipment capability |
| Equipment | `Equip_ItemList : List` | Implemented for retained removal and mode-0 flag edits with immutable slot/item identity; new equipment and slot reassignment remain in the separate inventory/equipment capability |
| position and orientation | GIT `XPosition`, `YPosition`, `ZPosition`, `XOrientation`, `YOrientation` | Implemented through retained-object transform planning and exact candidate readback |

## Form actions and calculated views

Palette Category, random-name buttons, portrait/conversation/script browse and
edit buttons, Load/Save Script Set, Levelup Wizard, Apply Template, Load/Save
Spell Set, Clear Class Spell List, Update Instances in Area, faction editor,
Restore, preview camera interaction, OK, and Cancel are commands or auxiliary
workflows. They do not authorize parallel retained GIT fields.

Ability modifiers, racial modifiers, ability totals, base/size/Dexterity AC,
total AC, base saves, total saves, Constitution HP bonus, total HP, calculated
CR, feat/spell summaries, and palette labels are derived presentation. Their
presence in `TDLGCREATUREEDIT` does not authorize guessed storage.

## CRUD and transaction closure

The implemented offline Creature lane includes one immutable `nw_chicken` UTC
construction profile, retained transform/property/list updates, deletion by
immutable family ordinal, complete candidate parse/readback, and
revision-fenced atomic ARE/GIT/GIC/IFO publication. Frontend Apply/OK/Cancel,
clone, undo/redo, local Save, and reopen preserve detached native provenance for
the admitted profiles.

This is not arbitrary Creature Create. General UTC-to-GIT materialization must
cover the exact native common record, derived-state changes, inventory and
equipment dependencies, and source identity without asset-name behavior
branches. The current fixed profile cannot be relabelled as dynamic support.

## Exact remaining implementation gates

1. Recover and implement the full `cbRaceChange` dependency/recalculation
   graph before enabling retained Race mutation.
2. Implement `CRAdjust` only together with the complete native CR calculator;
   `ChallengeRating + CRAdjust` is explicitly rejected as a shortcut.
3. Implement arbitrary effective UTC construction with bounded dependency
   closure and generic, source-derived conversion rather than concrete-template
   behavior keys.
4. Implement the complete shared localized-string editor semantics.
5. Implement arbitrary known/memorized class spell graphs and their table-
   bound validation.
6. Finish the separately catalogued arbitrary inventory/equipment matrix.

Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen and packed
readback, renderer comparison, and NWN runtime behavior remain release gates.
Until they pass, Creature authoring stays `PARTIAL/BLOCKED`.

## Evidence and verification map

The source-closed per-property decisions remain in the focused Creature audits
referenced by `objects_creature_authoring` in the immutable capability catalog.
The construction, inventory, equipment, parser, projector, planner, writer,
candidate-compiler, atomic-publication, frontend provenance/dialog, clone,
workspace, and regression suites remain the implementation evidence surface.

Capability revision `2026-09-02.171` records only the improved blocker
classification and this consolidated proof reference. It does not change an
API, native payload, persisted source, implementation total, or release total.
