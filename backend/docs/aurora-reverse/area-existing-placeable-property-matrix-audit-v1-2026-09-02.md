# Existing Area Placeable property-matrix audit v1

Date: 2026-09-02  
Status: native control/storage matrix classified; admitted retained-instance
profiles are implemented and offline-verified; complete localized-string and
live browser/Toolset/NWN certification remain blocked

## Decision

The former catalog blocker
`remaining_placeable_property_matrix_incomplete` is no longer precise. The
native `TDLGPLACEABLEEDIT` form and the complete placed-Placeable GFF
reader/writer lineage can now be accounted for without an unclassified
retained-instance property.

Aurora Web implements the admitted presence-sensitive compare-and-swap profile
for every persisted Placeable property represented by its current ordinary
property window. Unsupported source shapes remain visibly `PRESERVE_ONLY` and
cannot be materialized. This is not complete retail parity: `LocName` and
`Description` still expose only the deliberately bounded inline language-0
printable-ASCII mutation profile. The exact remaining implementation blocker is
therefore `placeable_full_localized_string_editor_pending`, followed by fresh
browser, Toolset, and NWN proof blockers.

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
- the frozen 5,328-byte `TDLGPLACEABLEEDIT` `TPF0` resource at RVA
  `0x00B7F104`, SHA-256
  `47e6d897b2e1803b465e15548145cca911f9cb12c87900901d628afc8a4b9777`.

No xoreos or other GPL source was inspected or used. This audit did not start
Docker, a container, service, watcher, browser, Chrome, Toolset, NWN, capture,
mutation testing, or a sub-agent.

## Native storage boundary

The complete common situated-object reader/writer is
`FUN_0063ae68` / `FUN_0063b8a0`. The Placeable template layer is
`FUN_0063bf74` / `FUN_0063c0a8`; the placed type-`9` Area instance layer is
`FUN_0063d0d8` / `FUN_0063d3d8`.

The common reader begins the relevant field sequence at decompiled line
`329599`; the reciprocal writer sequence begins at line `329869`. The
Placeable-specific reader handles `HasInventory`, `BodyBag`, `Useable`,
`Static`, `OnInvDisturbed`, and `OnUsed` at lines `330054-330071`; its writer
emits those fields at `330084-330090`. The placed layer calls the same complete
Placeable lineage, then owns placement `Bearing` and paired-GIC editor
`Comment` separately at `330504-330643`.

This lineage is exhaustive for stored placed-Placeable properties. It also
establishes that a visible form control is not automatically a GIT field.

## Exhaustive control and persistence matrix

| Native UI group/control | Native persisted member | Aurora Web offline disposition |
| --- | --- | --- |
| `Name` | `LocName : CExoLocString` | Implemented only for the exact inline `strRef=0xffffffff`, empty-or-one language/gender ID `0`, printable-ASCII profile; all other exact storage is preserved and blocked |
| `Tag` | `Tag : CExoString` | Implemented through immutable Placeable ordinal and exact expected/target pair |
| `Appearance Type` | canonical `Appearance : DWord` | Implemented with exact effective `placeables.2da` digest, physical row, and candidate readback |
| `HP` | `HP : Short` plus derived `CurrentHP : Short` | Implemented in the recovered Toolset range; `CurrentHP` is derived, not an independent control |
| `Hardness`, `Fort`, `Ref`, `Will` | four independent `Byte` fields | Implemented independently and presence-sensitively |
| `Plot` | canonical `Plot : Byte` | Implemented; legacy `Invulnerable` compatibility does not authorize adding or relocating the canonical field |
| `Useable`, `Inventory`, `Static` | `Useable`, `HasInventory`, `Static : Byte` | Implemented independently; `HasInventory` does not synthesize `ItemList` |
| Inventory editor | `ItemList : List` | Implemented as exact ordered retained-item CRUD with separate collection provenance |
| Lock page | `Locked`, `Lockable`, `AutoRemoveKey`, `KeyRequired`, `OpenLockDC`, `CloseLockDC : Byte`; `KeyName : CExoString` | Implemented as exact individual fields |
| Trap page | `TrapFlag`, `TrapDetectable`, `TrapDetectDC`, `TrapDisarmable`, `DisarmDC`, `TrapOneShot`, `TrapType : Byte` | Implemented as exact fields; `TrapType` is table-bound |
| Trap event actions | `OnDisarm`, `OnTrapTriggered : ResRef` | Implemented as canonical script ResRefs |
| Events page | `OnClick`, `OnClosed`, `OnDamaged`, `OnDeath`, `OnHeartbeat`, `OnInvDisturbed`, `OnLock`, `OnMeleeAttacked`, `OnOpen`, `OnSpellCastAt`, `OnUnlock`, `OnUsed`, `OnUserDefined : ResRef` | Implemented independently as canonical script ResRefs |
| `OnFailToOpen` frame row | no placed-Placeable member in the exhaustive common/Placeable reader or writer | Not a retained Placeable GIT mutation; the shared situated-scripts frame row cannot synthesize a missing native member |
| `Faction` | `Faction : DWord` | Implemented with exact module `repute.fac` physical ordinal and digest provenance |
| `Blueprint ResRef` | `TemplateResRef : ResRef` | Implemented for the exact canonical 1..16-byte profile; it never changes renderer/catalog identity or a UTP |
| `Conversation`, `Interruptable` | `Conversation : ResRef`, `Interruptable : Byte` | Implemented independently; the UI's `noInterrupt` view is the exact inverse of the native byte |
| `Portrait` | canonical `PortraitId : Word` | Implemented with exact effective `portraits.2da` row provenance; legacy `Portrait : ResRef` is not written |
| `Open State` | `AnimationState : Byte` | Implemented for the recovered `{0,1,2}` mapping; runtime animation playback remains uncertified |
| `Treasure Model` | `BodyBag : Byte` | Implemented with exact effective `bodybag.2da` physical-row provenance |
| Variables | `VarTable : List` | Implemented as exact ordered variable-table CRUD |
| `Description` | `Description : CExoLocString` | Same bounded inline language-0 printable-ASCII profile as `Name`; complete localized editing remains the exact implementation blocker |
| `Comments` | ordinal-paired GIC `Comment : CExoString` | Implemented without changing the gameplay GIT struct |
| position and bearing | GIT `X`, `Y`, `Z`, `Bearing` | Implemented through retained-object transform planning and isolated readback |

## Form actions that are not retained-instance properties

The 5,328-byte form also contains `Defaults`, palette-category browsing,
script browse/edit buttons, portrait/conversation browse actions,
`bUpdateInstancesInArea`, `OK`, and `Cancel`. These are commands or auxiliary
editor workflows, not additional persisted fields in the exhaustive placed
GIT reader/writer.

In particular:

- `ePaletteCategory` and `bPaletteCategory` operate on palette/blueprint
  organization and have no corresponding member in the placed-Placeable GIT
  lineage;
- `bUpdateInstancesInArea` is a bulk template propagation command. The current
  Area Update contract intentionally addresses only selected retained objects
  by immutable family ordinal;
- browse/edit buttons do not create additional storage beside the exact field
  they edit;
- `LightState` is absent from `TDLGPLACEABLEEDIT` and from the exhaustive placed
  GIT reader/writer. Blueprint lighting preview and NWScript runtime
  illumination/recompute semantics remain a separate renderer/runtime proof
  lane and cannot be guessed into Area GIT persistence.

## CRUD and transaction closure

The offline Placeable lane includes:

1. dynamic construction from one exact effective UTP blueprint and addition to
   the native `Placeable List`/paired GIC structure;
2. retained-property and transform update using complete expected/target pairs;
3. ordered inventory and variable-table collection mutation;
4. retained-object deletion by immutable family ordinal;
5. complete candidate parse/readback and revision-fenced atomic publication of
   the ARE/GIT/GIC/IFO set;
6. frontend Apply/OK/Cancel, clone, undo/redo, local Save, and reopen behavior
   for admitted profiles.

Presence, native type, family, ordinal, table digest, physical-row identity,
field uniqueness, target domain, and stale expected values are all fail-closed.
An absent or unsupported native profile remains readable/preserved and cannot
be converted into a guessed default.

## Exact remaining blockers

The vague remaining-property blocker is replaced with these auditable gates:

1. `placeable_full_localized_string_editor_pending`: recover and implement the
   complete Toolset language/gender vocabulary, active code-page conversion,
   TLK-to-inline transitions, duplicate/empty entry behavior, and lossless
   add/remove/reorder semantics for `LocName` and `Description`;
2. `browser_placeable_property_readback_proof_pending`: fresh exact-build web
   Save/reopen proof for the admitted matrix;
3. `native_toolset_placeable_property_save_build_reopen_pending`: exact
   candidate Toolset Save/Build/reopen and packed readback;
4. `nwn_placeable_property_runtime_proof_pending`: runtime behavior for fields
   that have gameplay or presentation effects.

Until those gates close, Placeable authoring remains `PARTIAL/BLOCKED`. This
audit closes unclassified offline matrix scope; it does not claim complete
localized-string parity, retail behavior, or release certification.

## Evidence map

The admitted per-property decisions and tests remain documented in:

- `area-existing-placeable-basic-identity-audit-v1-2026-08-17.md`;
- `area-existing-placeable-localized-strings-provenance-audit-v1-2026-08-19.md`;
- `area-existing-placeable-localized-string-mutation-audit-v1-2026-08-19.md`;
- `area-existing-placeable-lock-byte-fields-audit-v1-2026-08-17.md`;
- `area-existing-placeable-trap-byte-fields-audit-v1-2026-08-17.md`;
- `area-existing-placeable-script-resrefs-audit-v1-2026-08-17.md`;
- `area-existing-placeable-trap-script-resrefs-audit-v1-2026-08-17.md`;
- `area-existing-placeable-item-list-audit-v1-2026-08-17.md`;
- `area-existing-placeable-variable-table-audit-v1-2026-08-19.md`;
- the remaining focused Placeable audits referenced by the capability catalog.

The consolidated implementation gates are
`area-capability-catalog.spec.ts`, the complete parser/projector/writer/compiler
unit suites, `area-update-atomic-publication.spec.ts`, focused frontend domain,
provenance, dialog, scene-mutation, clone, and regression-smoke suites, and both
production builds.

## Offline verification checkpoint

The catalog change was introduced test-first: the focused catalog assertion
failed against revision `.162`, then passed after revision `.163`, the
consolidated audit reference, and exact blocker replacement were added. The
bounded one-worker Placeable/catalog group passes `16/16` suites and `287/287`
tests. The backend production build passes under the repository heap cap.

Runtime sources are bound to immutable v17 digest
`a304d5b6764346127fc21d3aabed9426a4ab7a1fa5d7eb60c5bc5b221025f357`
and replacement matrix plan
`179e27a1b9411ff989503c83c3a239b243f0e6ae7add9fbfe4d5d9b9e8365add`.
Active-plan validation and runtime-source identity both pass; its checkpoint is
still `0/3380` and no live capture was attempted.
