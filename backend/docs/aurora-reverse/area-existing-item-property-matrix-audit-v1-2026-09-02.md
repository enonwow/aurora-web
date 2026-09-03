# Existing Area ground-Item property-matrix audit v1

Date: 2026-09-02  
Status: native control/storage matrix classified; admitted retained-instance
profiles are implemented and offline-verified; complete localized-string and
live browser/Toolset/NWN certification remain blocked

## Decision

The former catalog blocker `full_item_property_matrix_incomplete` is no longer
precise. The native `TDLGITEMEDIT` form and the complete common Item GFF
reader/writer lineage can now be accounted for without an unclassified
retained ground-Item property.

Aurora Web implements the admitted presence-sensitive compare-and-swap profile
for every persisted Item property represented by its current ordinary property
window. Unsupported source shapes remain visibly `PRESERVE_ONLY` and cannot be
materialized. This is not complete retail parity: `LocalizedName`,
`Description`, and `DescIdentified` still expose only the deliberately bounded
inline language-0 printable-ASCII mutation profile. The exact remaining
implementation blocker is therefore `item_full_localized_string_editor_pending`,
followed by the existing fresh browser, Toolset, and NWN proof blockers.

## Immutable primary authority

This audit inspected only read-only local authority:

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
- the frozen 18,562-byte `TDLGITEMEDIT` `TPF0` resource at RVA
  `0x00B5F870`, SHA-256
  `3c86f285810d104114b1c60c46b610d5afd166462695c29e096fd057697ec3d1`.

No xoreos or other GPL source was inspected or used. This audit did not start
Docker, a container, service, watcher, browser, Chrome, Toolset, NWN, capture,
mutation testing, or a sub-agent.

## Native storage boundary

The complete common Item reader is `FUN_00604db8`, beginning at decompiled
line `299920`. The reciprocal common Item writer is `FUN_00605b0c`, beginning
at line `300282`; the adjacent writer entry `FUN_00605b12` exposes the same
field sequence. The retained type-`0` Area Item layer is
`FUN_006077a8` / `FUN_00607ccc` and delegates its Item payload to this common
lineage.

The reader loads `BaseItem`, `TemplateResRef`, `LocalizedName`,
`DescIdentified`, `Description`, `Tag`, `Charges`, `Cost`, `AddCost`, `Stolen`,
`StackSize`, `Plot`, `Identified`, `Cursed`, `PropertiesList`, and the
model-type-specific appearance fields. The writer emits the reciprocal
canonical fields at decompiled lines approximately `300299-300404` and
`300439-300488`. The retained Area layer owns placement and paired-GIC editor
metadata separately.

This lineage is exhaustive for stored common Item properties. It also proves
that a visible form control or computed label is not automatically a distinct
GIT field. In particular, no exact `PaletteID` member is read or written by the
common or retained ground-Item lineage.

## Exhaustive control and persistence matrix

| Native UI group/control | Native persisted member | Aurora Web offline disposition |
| --- | --- | --- |
| `Name` | `LocalizedName : CExoLocString` | Implemented only for exact inline `strRef=0xffffffff`, empty-or-one language/gender ID `0`, printable-ASCII storage; every other exact form is preserved and blocked |
| `Description (Unidentified)` | `Description : CExoLocString` | Same bounded inline language-0 profile; full localized editing remains blocked |
| `Description (Identified)` | `DescIdentified : CExoLocString` | Same bounded inline language-0 profile; independently presence-sensitive |
| `Blueprint ResRef` | `TemplateResRef : ResRef` | Implemented for the exact canonical 1..16-byte profile without changing catalog identity or a UTI |
| `Tag` | `Tag : CExoString` | Implemented through immutable Item ordinal and exact expected/target pair |
| `Item Type` / base appearance | `BaseItem : Int` plus the model-type-specific appearance vector | Implemented against one exact effective `baseitems.2da` digest and physical row; cross-profile changes require a complete explicit target vector |
| Simple/weapon model parts | `ModelPart1`, `ModelPart2`, `ModelPart3 : Word` as selected by `ModelType` | Implemented with exact native field profiles and ordering |
| Armor model parts | 19 exact `ArmorPart_* : Word` members | Implemented only as the complete `ModelType=3` profile |
| Material colors | `Leather1Color`, `Leather2Color`, `Cloth1Color`, `Cloth2Color`, `Metal1Color`, `Metal2Color : Byte` where admitted by `ModelType` | Implemented as the complete exact color vector |
| `Cost`, `Additional Cost` | `Cost`, `AddCost : DWord` | Implemented independently and presence-sensitively |
| `Charges` | `Charges : Byte` | Implemented independently and presence-sensitively |
| `Stack Size` | `StackSize : Word` | Implemented independently and presence-sensitively |
| `Stolen`, `Plot` | `Stolen`, `Plot : Byte` | Implemented as independent canonical bytes |
| `Identified`, `Cursed` | `Identified`, `Cursed : Byte` | Implemented independently; neither flag is inferred from description or property metadata |
| Item-property editor/list | `PropertiesList : List` | Implemented as ordered property-struct CRUD with table-bound identity and exact source provenance |
| Variables | `VarTable : List` | Implemented as exact ordered variable-table CRUD |
| Inventory editor | `ItemList : List` | Implemented as exact ordered nested-item CRUD for admitted UTI-backed entries |
| `Comments` | ordinal-paired GIC `Comment : CExoString` | Implemented without changing the gameplay GIT struct |
| position and bearing | GIT `X`, `Y`, `Z`, `Bearing` | Implemented through retained-object transform planning and isolated readback |

The form also displays derived values such as total cost, damage, critical
profile, weight, damage type, armor class, required level, lore requirement,
armor-check penalty, arcane failure, maximum Dexterity bonus, item-type text,
statistics descriptions, and item-property cost/minimum/maximum summaries.
Those values are derived from the selected `baseitems.2da` row and ordered
property graph; they are not additional independent fields in the exhaustive
Item reader/writer and therefore must not be synthesized into GIT storage.

## Form actions that are not retained ground-Item properties

The 18,562-byte form also contains palette-category selection, Restore Default,
2D/3D preview controls, appearance radio controls, browse/edit actions, Update
Instances in Area, OK, and Cancel. These are editor commands, presentation
state, or blueprint/palette workflows rather than extra retained type-`0` GIT
members.

In particular:

- palette category organizes blueprint palette placement; it is not a common
  or retained ground-Item GFF property;
- Restore Default and Update Instances are template-driven commands. The Area
  Update contract changes only the explicitly selected retained ordinal;
- 2D/3D and appearance radio controls select an editor preview or one of the
  model profiles; the stored authority remains `BaseItem` plus its exact native
  appearance vector;
- property add/edit/remove buttons mutate the one canonical ordered
  `PropertiesList`; they do not create parallel fields;
- browse and localized-string buttons operate on the exact field beside them
  and do not authorize guessed storage.

## CRUD and transaction closure

The offline Item lane includes:

1. dynamic construction from one exact effective UTI blueprint and addition to
   the native `Item List`/paired GIC structure;
2. retained-property and transform update using complete expected/target pairs;
3. ordered property, inventory, and variable-table collection mutation;
4. retained-object deletion by immutable family ordinal;
5. complete candidate parse/readback and revision-fenced atomic publication of
   the ARE/GIT/GIC/IFO set;
6. frontend Apply/OK/Cancel, clone, undo/redo, local Save, and reopen behavior
   for admitted profiles.

Presence, native type, family, ordinal, effective-table digest, physical-row
identity, field uniqueness, target domain, and stale expected values are all
fail-closed. An absent, malformed, ambiguous, or unsupported native profile
remains readable/preserved and cannot be converted into a guessed default.

## Exact remaining blockers

The vague remaining-property blocker is replaced with these auditable gates:

1. `item_full_localized_string_editor_pending`: recover and implement the
   complete Toolset language/gender vocabulary, active code-page conversion,
   TLK-to-inline transitions, duplicate/empty entry behavior, and lossless
   add/remove/reorder semantics for `LocalizedName`, `Description`, and
   `DescIdentified`;
2. the existing browser Item readback blockers: produce a fresh exact-build web
   Apply/Save/reopen proof for every admitted retained and collection profile;
3. the existing native Toolset blockers: exact candidate Save/Build/reopen and
   packed UTI/GIT/GIC readback for the root, blueprint, inventory, and property
   profiles;
4. the existing NWN blockers: runtime or presentation proof for fields whose
   semantics cannot be established by storage readback alone.

Until those gates close, Item authoring remains `PARTIAL/BLOCKED`. This audit
closes unclassified offline matrix scope; it does not claim complete
localized-string parity, retail behavior, or release certification.

## Evidence map

The admitted per-property decisions and tests remain documented in:

- `area-existing-item-editor-comment-audit-v1-2026-08-29.md`;
- `area-existing-item-instance-state-audit-v1-2026-08-29.md`;
- `area-existing-item-tag-audit-v1-2026-08-29.md`;
- `area-existing-item-template-resref-audit-v1-2026-08-29.md`;
- `area-existing-item-localized-string-mutation-audit-v1-2026-08-29.md`;
- `area-existing-item-variable-table-audit-v1-2026-08-29.md`;
- `area-existing-item-property-list-audit-v1-2026-08-30.md`;
- `area-existing-item-base-appearance-audit-v1-2026-08-30.md`;
- `area-existing-item-inventory-list-audit-v1-2026-08-30.md`;
- `area-existing-item-static-visual-transform-audit-v1-2026-08-30.md`;
- `area-item-dynamic-template-construction-audit-v1-2026-08-30.md`;
- `area-item-dynamic-nested-inventory-construction-audit-v1-2026-08-30.md`;
- `item-blueprint-nested-inventory-authoring-audit-v1-2026-08-30.md`;
- `area-existing-item-inventory-dynamic-add-audit-v1-2026-08-30.md`.

The consolidated implementation gates are
`area-capability-catalog.spec.ts`, the complete parser/projector/writer/compiler
unit suites, focused frontend domain/provenance/dialog/scene-mutation/clone and
regression-smoke suites, and both production builds.

## Offline verification checkpoint

The catalog change was introduced test-first: the focused catalog assertion
failed against revision `.163` before revision `.164`, this consolidated audit
reference, and the exact blocker replacement were added. The bounded
one-worker Item/catalog group passes `16/16` suites and `199/199` tests. The
backend production build passes under the repository heap cap.

Runtime sources are bound to immutable v18 digest
`2d857a0d8c83974653c98eb07198c26d6cd54c4723d718eca41993e1479aeebb`
and replacement matrix plan
`84d1ac84dd19144e1aa9e7b16b3a39a5a2ade55b050c79c1ae968f259efee630`.
Active-plan validation and runtime-source identity both pass; its checkpoint is
still `0/3380` and no live capture was attempted.
