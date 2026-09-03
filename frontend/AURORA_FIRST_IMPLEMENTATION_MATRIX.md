# Aurora First Implementation Matrix

Date snapshot: 2026-09-02
Scope: `frontend/` implementation status (code + tests), not only reverse notes.
Operational board: `frontend/AURORA_FRONTEND_EXECUTION_BOARD.md`
Retail hard-confirm test plan: `frontend/AURORA_RETAIL_HARDCONFIRM_TEST_PLAN.md`

Regression checkpoint: 2026-08-19 frontend unit `2705/2705`, frontend
regression smoke `78/78`, backend unit `3741/3741`, and both production builds
passed on the shared tree.

Latest bounded tile-render remediation checkpoint: shared crop/void behavior
no longer branches on concrete model ResRefs, and the runtime
`null`/`padding`/`tpad_*` classifier has been removed. Workspace composition
now consumes typed immutable certification dispositions (`process`, `blocked`,
or `excluded`); renderer settlement uses certified tile-definition IDs and no
longer substitutes a sibling group texture for a missing source. Focused
unit verification passes `22/22`, the new regression passes `1/1`, related
Area readiness/tile-light/scene-mapper tests pass `21/21`, the bounded
capability catalog passes `13/13`, and both production builds completed. At
capability revision `2026-09-02.161`, both backend producers are also free of
model-name behavior branches: the runtime sweep is exact-catalog/SHA bound and
the inventory producer requires an explicit `evidence-profile` or zero-
exclusion `none` mode. Pass 8 certifies zero exclusions from the observed SET
selection path. Pass 9 proves only that exact case-insensitive `NULL` returns
no model before lookup; it does not prove palette hiding and does not extend to
`(null)`, `padding`, or `tpad_*`. The production SET parser now preserves all
nonempty model declarations, and the catalog compiler requires exact
normalized declaration equality without a concrete-name exception.

The corrected conservative inventory/catalog retains all 99 tilesets and
53,700 rows: 45,034 are `source_resolved`, 8,666 are `source_missing`, and zero
are certified `intentional_placeholder`. The topology audit separates 8,096
historical-placeholder rows with at least one undeclared corner terrain from
564 with fully declared corner terrain, but also finds 41 non-placeholder rows
with undeclared topology; this is correlation only and certifies zero
exclusions. The deterministic current remediation queue keeps all 8,666 rows
blocked and groups them into 467 unique opaque missing-model identities. For
this exact current subject, 8,082 rows contain an undeclared corner terrain,
584 have all corner terrains declared, and all 8,666 use only declared edge
crossers. These cohorts do not authorize exclusions. A fresh source-bound v14
runtime profile and replacement matrix now validate against the current
source digest. The active checkpoint is `0/3380`; positive row disposition,
live visual recertification, and complete matrix execution remain open.

The decompilation evidence admission boundary requires a v2 evidence
envelope with exact output SHA-256 and bounded nonempty line citations for
every function finding. A separate hash-bound semantic reviewer must accept
the complete row/function subject before a different profile reviewer can map
it into exclusions. Decompilation v1 envelopes and free-form positive findings
remain rejected. Pass 8 has a negative audit only and therefore cannot silently
become renderer behavior.

The v2 decompilation-envelope workflow is implemented as a deterministic
two-phase CLI. Its draft hash-binds the lineage packet, independent validator,
sorted row proposal, and exact citations; finalization consumes a separate
semantic review and validates the temporary result through the production
loader before atomic publication. No real positive evidence envelope is
populated yet.

Latest bounded Encounter checkpoint: an existing type-`7` GIT ordered
`VarTable` is retained as immutable source provenance and edited through a
separate exact target. The shared bounded profile preserves physical order,
duplicate names, empty tables, and exact INT/FLOAT/CExoString variants while
rejecting malformed or over-budget storage. GIT-only CAS, atomic backend
publication, the real Workspace Apply/Cancel/reopen/OK/local-Save flow,
focused unit/regression gates, and both production builds pass at capability
revision `2026-09-01.135`. Fresh browser and native Toolset/NWN proof remain
open.

Status legend:
- `IMPLEMENTED`: shipped in current codebase and covered by tests.
- `SHELL`: visible UI/contract shell exists, but behavior is intentionally limited.
- `NOT_STARTED`: no runtime data model/flow yet in frontend.
- `RETAIL_CONFIRM`: blocked on hard retail confirmation before semantic finalization.

## Scope lanes
1. Placeables + Adjust Location + Visual Transform
2. Placeable Properties + Scripts tabs
3. VFX + Sound
4. Tiles + Tilesets + Groups
5. Doors + Transitions + Links
6. Area pipeline + Coordinates + Walkmesh
7. Ground Items
8. Creatures
9. Stores
10. Triggers
11. Encounters

---

## 1) Placeables + Adjust Location + Visual Transform

Status: `IMPLEMENTED` (MVP lane)

Implemented now:
1. `Adjust Location` dialog with `Position (X/Y/Z)`, `Orientation (Bearing)`, bearing dial, `Apply/OK/Cancel`.
2. Multi-selection edit path with one commit step per apply.
3. `Cancel` restores dialog-open snapshots.
4. Visual transform fields in the same dialog, shown only for `placeables/creatures/items`.
5. `Static` placeables store visual-transform values, renderer ignores them while `isStatic=true`.
6. Door guardrails are active: no generic move/rotate/adjust location for doors.
7. Static placeable generic move/rotate is blocked in world-transform flows (keyboard/gizmo/context-driven path entry), while `Adjust Location` remains explicit.
8. New `plc_watertrough` placeable drafts carry the exact admitted base-UTP `aurora_blueprint` provenance.
9. Area Update resolves the immutable retail UTP and atomically appends exact paired type-`9` GIT/GIC entries with persisted readback verification.

Evidence in repo:
1. `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
2. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
3. `frontend/tests/regression-smoke/workspace/Workspace.regression-smoke.test.tsx`
4. `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.test.ts`
5. `frontend/src/modules/scene/domain/areaWaypointConstructionProfile.ts`
6. `backend/docs/aurora-reverse/area-placeable-construction-audit-v1-2026-08-13.md`

Known implementation gaps (coding backlog, not retail-blocked):
1. Numeric clamps/step precision in dialog are still generic MVP, not Aurora-precise per field.
2. No explicit test for repeated `Apply` history granularity beyond current smoke coverage.
3. Exact Create is intentionally limited to `plc_watertrough`; arbitrary templates and editable native properties remain fail-closed.

Retail-hard-confirm gaps:
1. Exact Aurora orientation dial math/snapping/wrap behavior.
2. Canonical ARE/GIT serialization mapping for visual transform payload; the exact bounded base-UTP Create mapping is separately hard-confirmed.

---

## 2) Placeable Properties + Scripts tabs

Status: `OFFLINE_VERIFIED_BOUNDED_EXISTING_INSTANCE` with explicit
`PRESERVE_ONLY` controls; native Toolset/NWN certification remains open.

Implemented now:
1. The dialog exposes the Aurora tab structure and independently guarded
   existing-instance native lanes for Basic, Lock, Trap, Scripts, Advanced,
   Inventory, and paired-GIC Comments.
2. Apply/OK/Cancel, clone, snapshot, undo, and redo preserve immutable source
   provenance. Invalid, absent, stale, wrong-family, or unsupported changes
   fail closed.
3. Tag is ordinal-bound, Appearance is an effective-`placeables.2da`
   physical-row selector, and neither aliases the template ResRef.
4. Name/LocName and localized Description carry complete exact CExoLocString
   storage provenance. Their bounded inline language-0 printable-ASCII profile
   is independently editable and offline-verified; every other localized
   storage shape remains visibly `PRESERVE_ONLY`. Unresolved trap extensions
   and remaining Advanced identity fields are also `PRESERVE_ONLY`.
5. The exact per-control matrix and native persistence boundary are maintained
   in `frontend/AURORA_PLACEABLE_PROPERTIES_PARITY.md`.
6. Existing retained Placeable `Faction : DWord` is bound to one exact
   module-owned `repute.fac` catalog and one physical faction ordinal. The
   frontend carries a digest/count-bound immutable source, derives
   `belongsToFaction` only from the selected row, validates the complete
   catalog/source/target relation again when loading a saved workspace draft,
   and preserves Apply/OK/Cancel/reopen behavior. The backend parses and
   validates both native FAC lists, rechecks the current catalog and source
   DWord, writes only `Faction`, verifies whole-candidate readback, and keeps
   GIC, FAC, and IFO bytes unchanged. Missing, malformed, stale, wrong-family,
   duplicate, wrong-type, or unknown-row state remains fail-closed.
7. Existing retained Placeable `PortraitId : Word` is bound to one exact
   strongest module/ordered-HAK/vanilla `portraits.2da` and one selectable
   sparse physical row. The frontend keeps the numeric row as mutation
   identity, derives `portraitResRef` only from the exact catalog, and validates
   catalog/source/target coherence again when loading a saved workspace draft.
   The backend rechecks the canonical Word, current table digest/count, and
   requested row, writes no fallback `Portrait : ResRef`, verifies complete
   readback, and preserves GIC and IFO bytes. The admitted table ceiling is
   `65,536` physical rows because immutable retail evidence contains `16,001`.
8. Existing retained Placeable `TemplateResRef : ResRef` is independently
   editable through the Advanced `blueprintResRef` target for one exact
   lowercase `[a-z0-9_]{1,16}` source field. Saved-workspace validation requires
   the retained Placeable family and native ordinal plus valid immutable source
   and target values. Atomic publication changes only the retained instance
   field and preserves GIC and IFO bytes; it never resolves a UTP or changes
   renderer/catalog `SceneObject.resRef`. Apply/OK/Cancel/reopen/local-Save
   regression proves that separation end to end.
9. Existing retained Placeable `BodyBag : Byte` is bound to one exact strongest
   module/ordered-HAK/vanilla `bodybag.2da` and a digest/count-bound dense
   physical row. The numeric `treasureModelRow` is native identity; legacy
   `treasureModel` text remains non-authoritative. Saved-workspace validation,
   atomic Byte write/readback with GIC/IFO identity, and
   Apply/OK/Cancel/reopen/local-Save regression are complete offline.
10. Existing retained Placeable `TrapType : Byte` is bound to one exact
    strongest module/ordered-HAK/vanilla `traps.2da` and one digest/count-bound
    dense physical row. `trapTypeRow` is native identity; `SetDC`,
    `DetectDCMod`, and `DisarmDCMod` remain read-only projections from the same
    row. Saved-workspace validation rejects stale or derivation-incoherent
    state, atomic publication changes only `TrapType` while preserving GIC/IFO
    bytes, and Apply/OK/Cancel/reopen/local-Save regression is complete offline.
11. Existing retained Placeable `AnimationState : Byte` keeps the exact native
    mapping `0 = Closed`, `1 = Opened 1`, `2 = Opened 2`. Saved-workspace
    validation binds immutable source provenance to one independently edited
    frozen token and rejects unproven or malformed pairs. Atomic publication
    changes only `AnimationState`, preserves GIC/IFO bytes, and the complete
    Apply/OK/Cancel/reopen/local-Save regression is verified offline.
12. Existing retained Placeable `Conversation : ResRef` and
    `Interruptable : Byte` are independently presence-sensitive. The Advanced targets preserve
    an empty ResRef and invert only the proven Byte through `noInterrupt`.
    Saved-workspace validation rejects partial or unproven pairs; atomic
    publication changes only the exact native fields with GIC/IFO byte
    identity, and Apply/OK/Cancel/reopen/local-Save is verified offline.
13. Existing retained Placeable `Static : Byte` and `Useable : Byte` are
    independently presence-sensitive. Presentation-only fallbacks remain
    loadable when neither native field is proven, but they never become
    writable provenance. Saved-workspace validation rejects partial,
    malformed, or unproven source-target pairs; atomic publication changes
    only the exact native Bytes with GIC/IFO identity, and
    Apply/OK/Cancel/reopen/local-Save is verified offline.
14. Existing retained Placeable `Plot : Byte` and `HasInventory : Byte` are
    independently presence-sensitive. Presentation-only defaults remain
    loadable without provenance, while exact source members require boolean
    targets. Atomic publication changes only the selected native Bytes,
    preserves GIC/IFO and `ItemList`, and the complete
    Apply/OK/Cancel/reopen/local-Save flow is verified offline.
15. Existing retained Placeable `Hardness`, `Fort`, `Ref`, and `Will` native
    `Byte` fields are independently presence-sensitive and restricted to
    `0..255`. Saved-workspace validation accepts only the supported partial
    source map and exact matching targets. Atomic publication changes the four
    fields in native order with GIC/IFO identity, and the complete
    Apply/OK/Cancel/reopen/local-Save flow is verified offline.
16. Existing retained Placeable `HP : Short` and `CurrentHP : Short` use the
    exact source-closed Toolset relationship. Only HP is editable in
    `1..10000`; CurrentHP remains immutable provenance and is derived through
    Aurora's signed quotient/narrowing rule. Exact-pair workspace validation,
    atomic Short write/readback with GIC/IFO identity, and the full dialog/save
    regression are verified offline.
17. Existing retained Placeable editor `Comment : CExoString` is bound to the
    exact ordinal-paired GIC `Placeable List` entry. Empty string is valid and
    remains distinct from absent provenance. Source and target preserve exact
    `0..4096` ECMAScript code units without NUL, trimming, normalization, or
    truncation. Atomic publication changes only the paired GIC Comment while
    preserving GIT and IFO bytes; the full Apply/Cancel/OK/reopen/local-Save
    regression is verified offline.

Evidence in repo:
1. `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
2. `frontend/src/modules/layout/components/properties/PlaceablePropertiesDialog.tsx`
3. `frontend/src/modules/layout/application/workspaceObjectPropertyDrafts.ts`
4. `frontend/src/modules/areas/application/areaSceneMapper.ts`
5. `frontend/AURORA_PLACEABLE_PROPERTIES_PARITY.md`
6. `backend/docs/aurora-reverse/area-existing-placeable-faction-audit-v1-2026-08-19.md`
7. `backend/src/modules/catalog/adapters/outbound/blob/aurora-gff-faction-catalog.ts`
8. `backend/src/modules/areas/domain/area-placeable-faction.ts`
9. `frontend/src/modules/scene/domain/placeableFaction.ts`
10. `frontend/src/modules/layout/application/placeableFactionProvenance.ts`
11. `frontend/tests/regression-smoke/workspace/Workspace.placeable-faction.regression-smoke.test.tsx`
12. `backend/test/integration/area-update-atomic-publication.spec.ts`
13. `backend/docs/aurora-reverse/area-existing-placeable-portrait-id-audit-v1-2026-08-19.md`
14. `backend/src/modules/catalog/domain/effective-portraits-two-da.ts`
15. `backend/src/modules/areas/domain/area-placeable-portrait-id.ts`
16. `frontend/src/modules/scene/domain/placeablePortrait.ts`
17. `frontend/src/modules/layout/application/placeablePortraitProvenance.ts`
18. `frontend/tests/regression-smoke/workspace/Workspace.placeable-portrait.regression-smoke.test.tsx`
19. `backend/docs/aurora-reverse/area-existing-placeable-template-resref-audit-v1-2026-08-19.md`
20. `backend/src/modules/areas/domain/area-placeable-template-resref.ts`
21. `frontend/src/modules/scene/domain/placeableTemplateResRef.ts`
22. `frontend/src/modules/layout/application/placeableTemplateResRefProvenance.ts`
23. `frontend/tests/regression-smoke/workspace/Workspace.placeable-template-resref.regression-smoke.test.tsx`
24. `backend/docs/aurora-reverse/area-existing-placeable-body-bag-audit-v1-2026-08-19.md`
25. `backend/src/modules/catalog/domain/effective-bodybag-two-da.ts`
26. `backend/src/modules/areas/domain/area-placeable-body-bag.ts`
27. `frontend/src/modules/scene/domain/placeableBodyBag.ts`
28. `frontend/tests/regression-smoke/workspace/Workspace.placeable-body-bag.regression-smoke.test.tsx`
29. `backend/docs/aurora-reverse/area-existing-placeable-trap-type-audit-v1-2026-08-19.md`
30. `backend/src/modules/catalog/domain/effective-traps-two-da.ts`
31. `backend/src/modules/areas/domain/area-placeable-trap-type.ts`
32. `frontend/src/modules/scene/domain/placeableTrapType.ts`
33. `frontend/tests/regression-smoke/workspace/Workspace.placeable-trap-type.regression-smoke.test.tsx`
34. `backend/docs/aurora-reverse/area-existing-placeable-animation-state-audit-v1-2026-08-17.md`
35. `backend/src/modules/areas/domain/area-placeable-animation-state.ts`
36. `frontend/src/modules/scene/domain/placeableAnimationState.ts`
37. `frontend/src/modules/layout/application/placeableAnimationStateProvenance.ts`
38. `frontend/tests/regression-smoke/workspace/Workspace.placeable-animation-state.regression-smoke.test.tsx`
39. `backend/docs/aurora-reverse/area-existing-placeable-conversation-interruptable-audit-v1-2026-08-17.md`
40. `backend/src/modules/areas/domain/area-placeable-conversation-interruptable.ts`
41. `frontend/src/modules/scene/domain/placeableConversationInterruptable.ts`
42. `frontend/src/modules/layout/application/placeableConversationInterruptableProvenance.ts`
43. `frontend/tests/regression-smoke/workspace/Workspace.placeable-conversation-interruptable.regression-smoke.test.tsx`
44. `backend/docs/aurora-reverse/area-existing-placeable-static-useable-audit-v1-2026-08-17.md`
45. `backend/src/modules/areas/domain/area-update-draft-projector.ts`
46. `backend/src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer.ts`
47. `frontend/src/modules/layout/application/placeableBooleanProvenance.ts`
48. `frontend/tests/regression-smoke/workspace/Workspace.placeable-static-useable.regression-smoke.test.tsx`
49. `backend/docs/aurora-reverse/area-existing-placeable-plot-has-inventory-audit-v1-2026-08-17.md`
50. `backend/src/modules/areas/domain/area-update-draft-projector.ts`
51. `backend/src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer.ts`
52. `frontend/src/modules/layout/application/placeableBooleanProvenance.ts`
53. `frontend/tests/regression-smoke/workspace/Workspace.placeable-plot-has-inventory.regression-smoke.test.tsx`
54. `backend/docs/aurora-reverse/area-existing-placeable-durability-save-bytes-audit-v1-2026-08-17.md`
55. `backend/src/modules/areas/domain/area-placeable-basic-byte-fields.ts`
56. `backend/src/modules/areas/domain/area-update-draft-projector.ts`
57. `frontend/src/modules/layout/application/placeableDurabilitySaveProvenance.ts`
58. `frontend/tests/regression-smoke/workspace/Workspace.placeable-durability-save-bytes.regression-smoke.test.tsx`
59. `backend/src/modules/areas/domain/area-placeable-hit-points.ts`
60. `backend/test/integration/area-update-atomic-publication.spec.ts`
61. `frontend/src/modules/scene/domain/placeableHitPoints.ts`
62. `frontend/src/modules/layout/application/placeableHitPointProvenance.ts`
63. `frontend/tests/regression-smoke/workspace/Workspace.placeable-hit-points.regression-smoke.test.tsx`
64. `backend/docs/aurora-reverse/area-existing-placeable-comments-audit-v1-2026-08-17.md`
65. `backend/src/modules/areas/domain/area-placeable-editor-comment.ts`
66. `backend/test/integration/area-update-atomic-publication.spec.ts`
67. `frontend/src/modules/layout/application/placeableEditorCommentProvenance.ts`
68. `frontend/tests/regression-smoke/workspace/Workspace.placeable-editor-comment.regression-smoke.test.tsx`

Coding backlog (now):
1. Bounded inline language-0 printable-ASCII Name and Description projection,
   writer, readback, UI, and 100% mutation gates are complete. Full
   multilingual/TLK-backed authoring remains preserve-only until its larger
   native editor contract is source-closed.
2. Keep every unresolved field preserve-only until its exact native contract
   is recovered and covered by projection, planning, writer readback, UI, and
   mutation gates.
3. Remaining Placeable property families outside the explicitly admitted
   exact controls remain incomplete even though bounded `Faction`,
   `PortraitId`, `TemplateResRef`, `BodyBag`, `TrapType`, `AnimationState`, and
   `Conversation`/`Interruptable`, `Static`/`Useable`, plus
   `Plot`/`HasInventory` and `Hardness`/`Fort`/`Ref`/`Will` are now
   offline-verified together with the source-closed `HP`/`CurrentHP` pair and
   ordinal-paired GIC editor `Comment`.

Retail-hard-confirm gaps:
1. Fresh exact-candidate Toolset Save/Build/reopen and NWN certification.

---

## 3) VFX + Sound

Status: `PARTIAL` (sound), `PARTIAL_SOURCE_BACKED_RETAIL_BLOCKED` (VFX runtime)

Implemented now:
1. `sounds` exist as scene objects and can be selected/moved through generic object pipeline.
2. Sound objects appear in catalog and visibility/lock/isolation tooling.
3. Sound properties shell is implemented with tabs (`Basic`, `Positioning`, `Advanced`) and `Apply/OK/Cancel`.
4. Deterministic mode gating is implemented for `everywhere/random/specific`.
5. Sound positioning payload fields are wired in frontend object model and normalized on load/factory paths.
6. New sound drafts carry exact `aurora_blueprint` provenance for the admitted immutable `animalcriesday` UTS profile.
7. The Area Update backend resolves the exact base-game UTS bytes and atomically appends paired native type-`6` GIT/GIC entries with persisted readback verification.
8. VFX has versioned source-row, effect-instance, dependency-graph, phase-schedule, runtime-state, and render-contract payloads.
9. The shared client renderer consumes source-backed MDL emitter contracts, including textured, linked, chunk, P2P, atlas, material, light, and lifecycle lanes covered by focused tests.
10. The FE-BE payload separates `rendererEligibility` from `retailParityStatus`; source-backed local rendering no longer implies retail parity.
11. Retail evidence validation fails closed. The required ten-fixture parity set remains unpromoted and no missing retail artifact is synthesized.
12. Existing native Sound entries expose an exact provenance-bound base
    `Volume: BYTE` storage value in the admitted `0..127` Toolset domain. The
    backend performs independent source replanning, field-only CAS writing,
    candidate reconstruction, GIC preservation, and receipt accounting; the
    Basic tab edits the raw byte only when exact source/current storage exists.
13. Existing native Sound entries also expose the separately source-closed
    interval/variation tuple (`Interval`, `IntervalVrtn`, `PitchVariation`,
    `VolumeVrtn`) through the same fail-closed end-to-end mutation pipeline.
14. Existing native Sound entries expose exact `Hours: DWORD` and `Times: BYTE`
    storage as one provenance-bound CAS tuple. The Advanced tab maps native
    modes `0/1/2/3` to Specific Hours/Day/Night/Always and maps low bits `0..23`
    chronologically from 12 AM through 11 PM; unsupported values remain
    preserve-only.
15. Existing native Sound entries expose the exact canonical `Active: BYTE`
    value `0` or `1` through a provenance-bound field-only CAS. The Basic tab
    enables the Active checkbox only when complete exact source/current storage
    exists. Other nonzero native bytes remain preserve-only because the retail
    load path treats them as checked but the save path would canonicalize them.
16. Existing native Sound entries expose exact `Random: BYTE` Play Order
    storage as a provenance-bound field-only CAS. The Advanced tab maps
    `0=Sequential` and `1=Random`; it enables those radios only for complete
    exact source/current storage. Primary priority-derivation evidence proves
    that this byte is independent of derived `Priority`.
17. Existing native Sound entries expose one complete provenance-bound playback
    tuple covering the ordered exact `Sounds` ResRef list, canonical
    `Looping`/`Continuous`, derived `Priority`, `Positional`, `Interval`, and
    `IntervalVrtn`. Basic-list Remove/Move/Add operates only on exact
    source/current tuples; Add accepts a canonical ResRef selected from the
    backend catalog and never synthesizes placeholder names. The Advanced tab
    changes Play Once/Repeat/Seamlessly looping through that same tuple, so list
    membership/order and style are one atomic CAS with freshly derived Priority.
18. Existing native Sound entries now expose one authoritative aggregate
    `soundProfile` covering that ordered playback tuple plus exact
    `RandomPosition`, `Elevation`, `MaxDistance`, `MinDistance`,
    `RandomRangeX`, and `RandomRangeY` storage. The Positioning tab admits only
    complete source/current provenance, maps everywhere/specific/random to the
    proven flag pairs, preserves signed `-10..10` Height, enforces the retail
    `0.2..320` outer-radius and `0..outer` inner-radius domains, and writes list,
    Play Style, positioning, attenuation, and derived Priority as one CAS.
    Legacy playback and Play Style remain non-racing fallbacks only. The
    viewport and runtime audio preview now share geometry revision
    `aurora-sound-guide-world-geometry.v1`: signed Height, exact inner/outer
    radii, and centered full-span X/Y random ranges drive one generic projection.
    Editor-only guide geometry is diagnosed on the Sound marker and is never
    serialized into the Area update.

Not implemented yet:
1. Fresh browser visual proof for the source-closed Sound attenuation,
   random-box, and signed-Height guides, plus exact NWN audio behavior proof.
2. Complete ingestible retail evidence packs and exact NWN comparison oracles for all ten required VFX fixtures.
3. Retail-verified cross-lane ordering, camera/scene/material/postprocess behavior, and unresolved family-specific parity gaps.

Evidence in repo:
1. `frontend/src/modules/scene/contracts.ts`
2. `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
3. `frontend/src/modules/layout/application/sceneObjectCatalogQueryFacade.ts`
4. `frontend/tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`
5. `frontend/tests/unit/modules/scene/sceneFactory.test.ts`
6. `frontend/tests/unit/modules/scene/application/sceneCanvasFacade.test.ts`
7. `frontend/src/modules/scene/domain/areaWaypointConstructionProfile.ts`
8. `backend/docs/aurora-reverse/area-sound-construction-audit-v1-2026-08-13.md`
9. `frontend/src/modules/scene/domain/auroraVfxPayload.ts`
10. `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`
11. `backend/src/modules/catalog/application/catalog.application.service.ts`
12. `backend/docs/aurora-reverse/vfx-and-aurora-decompilation-audit-2026-08-17.md`
13. `backend/docs/aurora-reverse/vfx-renderer-eligibility-retail-parity-contract-v1-2026-08-17.md`
14. `backend/docs/aurora-reverse/area-existing-sound-interval-variation-mutation-audit-v1-2026-08-25.md`
15. `backend/docs/aurora-reverse/area-existing-sound-volume-mutation-audit-v1-2026-08-25.md`
16. `backend/src/modules/areas/domain/area-sound-volume-storage.ts`
17. `frontend/src/modules/areas/domain/areaSoundVolumeStorage.ts`
18. `backend/docs/aurora-reverse/area-existing-sound-schedule-mutation-audit-v1-2026-08-25.md`
19. `backend/src/modules/areas/domain/area-sound-schedule-storage.ts`
20. `frontend/src/modules/areas/domain/areaSoundScheduleStorage.ts`
21. `backend/docs/aurora-reverse/area-existing-sound-active-mutation-audit-v1-2026-08-25.md`
22. `backend/src/modules/areas/domain/area-sound-active-storage.ts`
23. `frontend/src/modules/areas/domain/areaSoundActiveStorage.ts`
24. `backend/docs/aurora-reverse/area-existing-sound-play-order-mutation-audit-v1-2026-08-25.md`
25. `backend/src/modules/areas/domain/area-sound-play-order-storage.ts`
26. `frontend/src/modules/areas/domain/areaSoundPlayOrderStorage.ts`
27. `backend/docs/aurora-reverse/area-existing-sound-play-style-priority-mutation-audit-v1-2026-08-25.md`
28. `backend/src/modules/areas/domain/area-sound-play-style-storage.ts`
29. `frontend/src/modules/areas/domain/areaSoundPlayStyleStorage.ts`
30. `backend/docs/aurora-reverse/area-existing-sound-playback-list-mutation-audit-v1-2026-08-25.md`
31. `backend/src/modules/areas/domain/area-sound-playback-storage.ts`
32. `frontend/src/modules/areas/domain/areaSoundPlaybackStorage.ts`
33. `backend/docs/aurora-reverse/area-existing-sound-spatial-profile-mutation-audit-v1-2026-08-25.md`
34. `backend/src/modules/areas/domain/area-sound-profile-storage.ts`
35. `frontend/src/modules/areas/domain/areaSoundProfileStorage.ts`
36. `frontend/src/modules/layout/soundGuideDomain.ts`
37. `frontend/tests/unit/modules/layout/soundGuideDomain.test.ts`
38. `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`

Coding backlog (now):
1. Capture fresh browser proof of the profile-bound Sound guide geometry and
   Save/reopen readback without weakening exact provenance gates.
2. Capture browser Save/reopen plus exact-candidate Toolset/NWN proof for the
   closed Sound profile without weakening exact provenance gates.
3. Split the oversized VFX renderer and backend catalog packaging surfaces into bounded modules without changing runtime semantics.
4. Produce the prerequisite coordinator/control artifacts through their authoritative workflow so the retail gates can progress beyond structured blockers.

Retail-hard-confirm gaps:
1. Exact runtime semantics for sound playback/attenuation edge-cases.
2. VFX runtime math: blend/sort/overflow/collision behavior.

---

## 4) Tiles + Tilesets + Groups

Status: `PARTIAL`

Implemented now:
1. Tile grid with basic fields (`terrain`, `orientation`, `rotateTexture`, `plot`).
2. Terrain mutation path (`updateTileTerrain`) and viewport rendering basics.
3. Tileset/groups preserve-first domain scaffolding is implemented.
4. Structural validators are implemented (`width*height == tile_count`, group consistency checks).
5. The Area pipeline resolves the effective SET, validates `Tile_ID`, model
   membership, orientation, and complete group placement, and retains exact
   source-backed tile/model provenance for rendering and diagnostics.
6. The renderer consumes source-backed tile model contracts and exposes
   explicit bridge/fallback telemetry instead of silently treating a fallback
   mesh as retail geometry.
7. A hash-bound `tms01` PathConnect positive/negative differential candidate
   is packed with Toolset readback and an armed AUR-S07 NWN runtime profile.
8. Existing black crop/void calibrations are consumed through a versioned,
   immutable profile selected by source MDL SHA-256. Shared renderer logic no
   longer compares the calibrated ResRefs, filenames, tile IDs, or catalog IDs;
   selected profile revision/hash/evidence state are exposed diagnostically.
9. Source-missing multi-cell members fail closed; a sibling model or visual
   bridge is not accepted as the missing member's source closure.
10. The inventory/source-corpus parser derives complete group membership from
    `GROUPS`/`GROUPn`, preserves `-1` holes and repeated palette membership,
    and no longer reports grouped missing-source rows as standalone.
11. The SET parser preserves every nonempty model/image-map declaration,
    including `NULL` and `(null)`. The catalog compiler uses exact normalized
    declaration equality, and the inventory has an explicit fail-closed zero-
    exclusion mode. The corrected offline 99-tileset catalog contains all
    53,700 rows with no identity-selected placeholder behavior.
12. The current source digest is bound by runtime-build profile v14, and the
    active replacement plan validates at 99 tilesets, 45,031 Add/Render rows,
    44,692 connection rows, and 3,380 chunks without starting runtime services.
13. A deterministic inventory-bound remediation queue covers all 8,666
    source-missing rows, rejects identity-based behavior and inferred sibling
    substitution, and admits only exact source or accepted row-bound native
    evidence as closure.

Not implemented yet:
1. A fresh AUR-S07 positive-crossing/negative-non-crossing NWN result for the
   packed candidate.
2. Native PathConnect admission and complete visual/runtime certification for
   the declared tileset matrix; the bounded candidate must not be generalized.
3. Fresh live visual recertification of the hash-bound crop/void profiles.
4. Exact source repair or accepted row-bound native disposition proof for all
   8,666 conservative source-missing rows; passes 8 and 9 certified zero
   exclusions. Topology identifies review cohorts but is not runtime proof.
5. Complete the active source-frozen v14 Add/Render/adjacency capture; its
   checkpoint is `0/3380`. The old v12/v13 checkpoints are historical and
   must not be resumed.

Evidence in repo:
1. `frontend/src/modules/scene/contracts.ts`
2. `frontend/src/modules/scene/domain/sceneFactory.ts`
3. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
4. `frontend/src/modules/scene/domain/tilesets.ts`
5. `frontend/src/modules/scene/domain/tilesetsValidators.ts`
6. `frontend/tests/unit/modules/scene/domain/tilesets.test.ts`
7. `frontend/tests/unit/modules/scene/domain/tilesetsValidators.test.ts`
8. `frontend/src/modules/tiles/domain/areaTileRenderProfile.ts`
9. `frontend/src/modules/tiles/domain/areaTileRenderProfileManifest.v1.json`
10. `frontend/tests/unit/modules/tiles/areaTileRenderProfile.test.ts`
11. `frontend/tests/regression-smoke/areaTileRenderProfile.regression-smoke.test.ts`
12. `docs/brainstorm/2026-09-01-area-tile-identity-neutral-render-profile-checkpoint.md`
13. `backend/docs/aurora-reverse/area-tile-placeholder-decompilation-pass9-semantic-audit-v1-2026-09-01.md`
14. `backend/docs/aurora-reverse/evidence/area-tile-placeholder-decompilation-pass9-semantic-audit-2026-09-01/manifest.json`
15. `backend/docs/aurora-reverse/evidence/area-tile-placeholder-topology-source-audit-2026-09-01/manifest.json`
16. `docs/brainstorm/2026-09-01-area-tile-source-eligibility-producer-checkpoint.md`
17. `backend/docs/aurora-reverse/proof-profiles/tile-add-connect-runtime-build-v14-source-remediation-bound-2026-09-02.json`
18. `backend/docs/aurora-reverse/proof-profiles/tile-add-connect-active-plan.json`
19. `output/proof/area-tile-source-inventory-v1-conservative-2026-09-01/summary.json`
20. `output/proof/area-tileset-definition-catalog-v2-conservative-2026-09-01/catalog.json`
21. `output/proof/area-tile-source-remediation-queue-v1-2026-09-02.json`
22. `backend/docs/aurora-reverse/area-tile-source-remediation-queue-audit-v1-2026-09-02.md`
23. `output/proof/tile-add-connect-matrix-v14-source-remediation-bound-2026-09-02/manifest.json`

Coding backlog (now):
1. Complete the user-owned Test Module runtime packet and validate it through
   the central fail-closed PathConnect gate.
2. Continue bounded tileset coverage only from hash-bound source definitions
   and accepted proof packets.
3. Obtain new row-bound native evidence for any historical placeholder
   exclusion and exact source repair or narrower native visibility proof for
   the 8,666 conservative missing-source rows before runtime certification.
   Passes 8 and 9 cannot populate the profile because they certified zero
   exclusions. Preserve the verified v14 source digest until its controlled
   runtime lane starts; any new runtime-source write requires a new profile and
   replacement plan.

Retail-hard-confirm gaps:
1. 2x2 master-cell semantics and neighborhood material precedence from retail.

---

## 5) Doors + Transitions + Links

Status: `PARTIAL`

Implemented now:
1. Door anchor guardrails are active across context menu, keyboard move, transform controls, and mutation facade.
2. Adjust Location action is hidden for doors.
3. The exact native retained-Door storage trio (`LinkedTo : CExoString`,
   `LinkedToFlags : Byte`, `LoadScreenID : Word`) is validated at HTTP,
   persisted-workspace, scene, and draft boundaries without trimming,
   coercion, target inference, or flag decoding.
4. Door Properties exposes the exact trio as editable only when immutable
   type-`8` GIT source/ordinal provenance is present. Historical alias payloads
   remain visible and read-only.
5. Apply projects one complete expected/target CAS pair into the atomic Area
   Update GIT/GIC path. Copy and drag/drop intentionally omit the
   existing-instance storage provenance.

Not implemented yet:
1. Fresh browser Save/reopen evidence for the exact trio.
2. Exact-candidate Toolset Save/Build/reopen and NWN traversal/loading-screen
   behavior proof, including independent DWK/WOK accessibility evidence.
3. Native runtime meaning of individual `LinkedToFlags` values; the UI keeps
   the Byte uninterpreted until primary evidence closes that semantic.

Evidence in repo:
1. `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
2. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
3. `frontend/src/modules/scene/domain/sceneFactory.ts`
4. `frontend/tests/regression-smoke/workspace/Workspace.regression-smoke.test.tsx`
5. `frontend/tests/regression-smoke/workspace/Workspace.door-properties.regression-smoke.test.tsx`
6. `frontend/tests/unit/modules/scene/domain/sceneFactory.doorTransitions.test.ts`
7. `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.test.ts`
8. `frontend/src/modules/shared/domain/areaDoorTransitionStorage.ts`
9. `frontend/src/modules/layout/application/doorTransitionStorageProvenance.ts`
10. `frontend/tests/unit/modules/layout/components/properties/DoorPropertiesDialog.transitionStorage.test.tsx`
11. `frontend/tests/regression-smoke/areaDoorTransitionStorage.regression-smoke.test.tsx`
12. `backend/docs/aurora-reverse/area-existing-door-transition-storage-audit-v1-2026-08-22.md`

Coding backlog (now):
1. Add alias-safe parse/write tests in frontend contract layer.
2. Add editable workflow only where retail semantics are hard-confirmed.

Retail-hard-confirm gaps:
1. Real semantics of `LinkedToFlags`, `LoadScreenID`, and write-path normalization policy.

---

## 6) Area pipeline + Coordinates + Walkmesh

Status: `PARTIAL`

Implemented now:
1. Coordinate operations are deterministic in frontend: bounded `x/y`,
   normalized bearing, and signed native object Z/visual offset Z preserved
   through local-draft normalization.
2. History + local draft persistence pipeline is in place.
3. Walkmesh overlay toggle exists in tooling as debug UI switch.
4. Dedicated coordinate parity fixtures are implemented in unit + regression-smoke suites.
5. Preserve-first walkmesh payload contract stub exists in domain (`frontend/src/modules/scene/domain/walkmesh.ts`) with normalization/validation tests.

Not implemented yet:
1. Walkmesh runtime query engine/pathing semantics in frontend.
2. ARE/GIT/IFO integration and retail parity fixtures.

Evidence in repo:
1. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
2. `frontend/src/modules/scene/adapters/localDraftStore.ts`
3. `frontend/src/modules/layout/roleTopbarPolicy.ts`
4. `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.coordinateParity.test.ts`
5. `frontend/tests/regression-smoke/workspace/Workspace.coordinate-parity.regression-smoke.test.tsx`

Coding backlog (now):
1. Wire walkmesh payload contract stub into import/export boundaries and replace UI-only assumptions.
2. Add area import/export boundary contracts (ARE/GIT preserve-only first).
3. Expand coordinate parity fixture set for edge-case snapshots (multi-selection bounds, mixed-kind clamps).

Retail-hard-confirm gaps:
1. Global origin, axis sign conventions, and cross-area pathing parity against retail.

---

## 7) Ground Items

Status: `PARTIAL` (effective-catalog bounded Create + existing transform + retained GIT
localized strings/`TemplateResRef`/`Tag`/instance state/`VarTable`/
`PropertiesList`/BaseItem appearance/nested `ItemList` including exact
effective-catalog additions/static `VisTransformList` + paired GIC `Comment`)

Implemented now:
1. New `items` drafts use deterministic local identities and carry the exact
   binary-free `aurora_blueprint` provenance for the admitted
   `nw_cloth022.UTI` profile.
2. Factory and local-draft round-trip preserve the exact source family,
   profile, template, digest, GFF identity, ResRef, tag, and transform.
3. Area Update resolves the immutable retail UTI and atomically appends exact
   paired type-`0` root `List` GIT/GIC entries with persisted readback.
4. Existing native ground-item position and orientation-vector transforms are
   preserved and verified through the shared object-mutation path.
5. Existing ground-item editor `Comment : CExoString` is read from the exact
   same-ordinal type-`0` GIC `List` struct and exposed as `ACTIVE_NOW` only
   under exact paired provenance. The bounded compare-and-swap mutation changes
   only that GIC field, preserves whitespace and code units verbatim, keeps
   GIT/ARE/IFO byte-identical, and survives Apply, Cancel, reopen, and local
   Save. Missing, duplicated, wrongly typed, unpaired, NUL-bearing, over-budget,
   or stale storage remains `PRESERVE_ONLY`.
6. Existing retained ground-item `Charges : Byte`, `Cost : DWord`,
   `Stolen : Byte`, `StackSize : Word`, `Plot : Byte`, `AddCost : DWord`,
   `Identified : Byte`, and `Cursed : Byte` are implemented as one complete,
   presence-sensitive GIT state. Exact source provenance enables the eight
   controls as `ACTIVE_NOW`; malformed or loose metadata remains
   `PRESERVE_ONLY`. The full-vector CAS preserves unrelated fields and paired
   GIC bytes, supports an atomic combination with the independently admitted
   GIC Comment change, and survives Apply, Cancel, reopen, OK, and local Save.
7. Existing retained ground-item `Tag : CExoString` is editable only when one
   exact physically present same-ordinal GIT field is bound by immutable Item
   provenance. The 32-UTF-16-code-unit, no-NUL CAS preserves empty values and
   whitespace verbatim, replaces only that existing field, composes atomically
   with instance state and paired GIC Comment, and survives Apply, Cancel,
   reopen, OK, and local Save. Missing or ambiguous storage remains visibly
   `PRESERVE_ONLY`; scene display labels never grant mutation authority.
8. Existing retained ground-item `TemplateResRef : ResRef` is editable only
   when one exact canonical present same-ordinal GIT field is bound by
   immutable Item provenance. The `[a-z0-9_]{1,16}` compare-and-swap replaces
   only that existing field, composes atomically with Tag, instance state, and
   paired GIC Comment, and survives Apply, Cancel, reopen, OK, and local Save.
   Missing, noncanonical, wrongly typed, duplicated, or stale storage remains
   visibly `PRESERVE_ONLY`; loose display/catalog identities never grant
   mutation authority or trigger writer-side normalization.
9. Existing retained ground-item `LocalizedName`, `Description`, and
   `DescIdentified : CExoLocString` are preserved as one complete exact GIT
   provenance triple and admitted independently for bounded inline language-0
   printable-ASCII mutation. The name budget is 256 bytes and each description
   budget is 4,096 bytes. Selected fields use exact expected/value CAS in native
   writer order; unsupported TLK-backed, multilingual, absent, malformed,
   duplicated, non-ASCII, or stale members remain independently
   `PRESERVE_ONLY`. The writer changes only selected existing type-`12` fields,
   preserves unrelated GIT fields and paired GIC bytes, and the frontend keeps
   immutable source storage through Apply, Cancel, reopen, OK, and local Save.
10. Existing retained ground-item `VarTable` is implemented as one exact,
    ordered, duplicate-name-preserving GIT list for native Int, Float, and
    CExoString entries. Immutable ordinal-bearing provenance gates the native
    Variables editor; unsupported types, non-float32 values, malformed or stale
    storage remain `PRESERVE_ONLY`. The previous arbitrary Item Scripts shell
    is removed because the Toolset Item dialog exposes Variables and no Item
    event-script page; compatibility script metadata remains preserved only.
11. Item property application now has an explicit instance/template boundary.
    Only an `itm_wizard_*` object owned by Items mode may publish or materialize
    blueprint-only UTI controls. A retained or placed Area Item can materialize
    only exact provenance-backed fields; name/StrRef/palette/BaseItem,
    model/armor/cloak/color, property-list, and other unproven controls are
    visibly disabled and cannot be injected through a forged UI draft. The
    skipped-blueprint route emits a diagnosed telemetry event.
12. Existing retained ground-item static base-scope `VisTransformList` is
    implemented for exact physical absence or one canonical non-default
    type-`6` scope containing ten static type-`0` controllers. Immutable source
    provenance, exact native target storage, and renderer/UI presentation are
    separate. Adjust Location and gizmos are `ACTIVE_NOW` only when the exact
    retained Item owns both source and target; every edit synchronizes native
    binary32 axes and scene presentation. Create, replace, and default-removal
    use complete ordinal-bound CAS, preserve unrelated GIT data and paired GIC
    bytes, and pass whole-candidate readback plus Apply/reopen/local-Save
    regression. Legacy, animated, multi-scope, aliased, malformed, stale, or
    unsafe storage remains `PRESERVE_ONLY`.
13. New ground Items can be placed from any exact current effective UTI winner
    carrying complete immutable provenance. Canonical non-empty UTI `ItemList`
    and `Equip_ItemList` are resolved as one digest-bound recursive dependency
    closure, all BaseItems use one effective `baseitems.2da` snapshot, and the
    paired writer expands references into deterministic complete embedded GIT
    instances. Cycles, stale/missing/unused dependencies, invalid equipment
    slots, and depth/count/byte budget violations fail closed.
14. Items-mode wizard targets can author canonical non-empty UTI `ItemList`
    and `Equip_ItemList` reference lists. The UI supports ordinary add,
    ResRef/Word-coordinate edit, reorder, and remove plus equipment add,
    ResRef/unused-slot edit, and remove. One exact shared boundary rejects
    unknown keys, aliases, noncanonical ResRefs, invalid Words, duplicate or
    unordered one-hot slots, self-reference, and combined-budget overflow.
    Before blueprint publication the backend re-resolves every distinct
    effective UTI, verifies immutable bytes and closure, and rejects missing,
    stale, malformed, or update-created cyclic graphs. Retained Area Items do
    not inherit this wizard blueprint-reference authoring authority.
15. Retained ground-Item mode-`1` `ItemList` targets can add ordinary children
    from any exact current effective UTI winner, including when physical source
    storage is absent or empty. The ordered target may interleave retained and
    new entries, edit repository Word coordinates, reorder, and remove either
    form, while retained source ordinals stay immutable and new entries carry
    complete digest-bound catalog provenance. The backend re-resolves each
    distinct winner and recursive dependency closure, binds every BaseItem to
    one effective table, writes canonical embedded children with native
    position/orientation sentinels, preserves unrelated GIT and paired GIC
    bytes, and requires whole-candidate readback. The UI offers exact catalog
    selection only—never loose ResRef insertion—and Apply/Cancel/reopen/local
    Save preserve the union while source CAS remains retained-only. Offline
    domain, compiler, writer, viewport, property-window, clone, persistence,
    and regression coverage is green; browser and native proof remains open.

Not implemented yet:
1. Fully arbitrary UTI authoring across every native root field and Toolset
   control remains incomplete.
2. Non-inline/multilingual localized strings and animated,
   multi-scope, or legacy visual-transform authoring outside the admitted
   exact profiles.
3. Native Item event-script authoring is not established; compatibility
   script metadata stays preserve-only and is not presented as Aurora parity.
4. Fresh exact-candidate Toolset Save/Build/reopen and NWN certification.

Evidence in repo:
1. `frontend/src/modules/scene/domain/areaWaypointConstructionProfile.ts`
2. `frontend/tests/unit/modules/scene/sceneFactory.test.ts`
3. `frontend/tests/unit/modules/scene/localDraftStore.test.ts`
4. `frontend/tests/unit/modules/scene/domain/areaWaypointConstructionProfile.test.ts`
5. `backend/docs/aurora-reverse/area-item-construction-audit-v1-2026-08-13.md`
6. `backend/docs/aurora-reverse/area-existing-item-editor-comment-audit-v1-2026-08-29.md`
7. `backend/test/unit/area-item-editor-comment.spec.ts`
8. `frontend/tests/regression-smoke/workspace/Workspace.item-editor-comment.regression-smoke.test.tsx`
9. `backend/docs/aurora-reverse/area-existing-item-instance-state-audit-v1-2026-08-29.md`
10. `backend/test/unit/area-item-instance-state.spec.ts`
11. `backend/test/unit/area-item-instance-state-parser.spec.ts`
12. `backend/docs/aurora-reverse/area-existing-item-variable-table-audit-v1-2026-08-29.md`
13. `frontend/tests/unit/modules/layout/application/itemPropertiesDraftMaterialization.test.ts`
14. `frontend/tests/unit/modules/layout/application/itemBlueprintPropertiesApplyRouting.test.ts`
15. `frontend/tests/unit/modules/scene/domain/itemInstanceState.test.ts`
16. `frontend/tests/unit/modules/layout/application/itemInstanceStateProvenance.test.ts`
17. `frontend/tests/regression-smoke/workspace/Workspace.item-instance-state.regression-smoke.test.tsx`
18. `backend/docs/aurora-reverse/area-existing-item-tag-audit-v1-2026-08-29.md`
19. `backend/test/unit/area-item-tag.spec.ts`
20. `backend/test/unit/area-item-tag-parser.spec.ts`
21. `frontend/tests/unit/modules/scene/domain/itemTag.test.ts`
22. `frontend/tests/unit/modules/layout/application/itemTagProvenance.test.ts`
23. `frontend/tests/regression-smoke/workspace/Workspace.item-tag.regression-smoke.test.tsx`
24. `backend/docs/aurora-reverse/area-existing-item-template-resref-audit-v1-2026-08-29.md`
25. `backend/src/modules/areas/domain/area-item-template-resref.ts`
26. `backend/test/unit/area-item-template-resref.spec.ts`
27. `backend/test/unit/area-item-template-resref-parser.spec.ts`
28. `frontend/src/modules/scene/domain/itemTemplateResRef.ts`
29. `frontend/src/modules/layout/application/itemTemplateResRefProvenance.ts`
30. `frontend/tests/regression-smoke/workspace/Workspace.item-template-resref.regression-smoke.test.tsx`
31. `backend/docs/aurora-reverse/area-existing-item-localized-string-mutation-audit-v1-2026-08-29.md`
32. `backend/src/modules/areas/domain/area-item-localized-strings.ts`
33. `backend/src/modules/areas/domain/area-item-localized-string-mutation.ts`
34. `frontend/src/modules/scene/domain/itemLocalizedStrings.ts`
35. `frontend/src/modules/layout/application/itemLocalizedStringProvenance.ts`
36. `frontend/tests/regression-smoke/workspace/Workspace.item-localized-strings.regression-smoke.test.tsx`
37. `backend/docs/aurora-reverse/area-existing-item-static-visual-transform-audit-v1-2026-08-30.md`
38. `backend/src/modules/areas/domain/area-item-visual-transform.ts`
39. `backend/test/unit/area-item-visual-transform.spec.ts`
40. `frontend/src/modules/scene/domain/itemVisualTransform.ts`
41. `frontend/tests/unit/modules/scene/domain/itemVisualTransform.test.ts`
42. `frontend/tests/unit/modules/layout/workspaceSceneObjectClone.itemVisualTransform.test.ts`
43. `frontend/tests/regression-smoke/workspace/Workspace.item-visual-transform.regression-smoke.test.tsx`
44. `backend/docs/aurora-reverse/item-blueprint-nested-inventory-authoring-audit-v1-2026-08-30.md`
45. `backend/test/unit/aurora-gff-uti-writer.spec.ts`
46. `frontend/src/modules/scene/domain/itemBlueprintInventory.ts`
47. `frontend/tests/unit/modules/items/itemBlueprintInventory.test.ts`
48. `frontend/tests/regression-smoke/workspace/Workspace.item-blueprint-nested-inventory.regression-smoke.test.tsx`
49. `backend/docs/aurora-reverse/area-existing-item-inventory-dynamic-add-audit-v1-2026-08-30.md`
50. `backend/test/unit/area-item-inventory.spec.ts`
51. `backend/test/unit/area-dynamic-item-construction.spec.ts`
52. `backend/test/unit/area-update-candidate-compiler.spec.ts`
53. `backend/test/unit/aurora-gff-area-object-pair-writer.spec.ts`
54. `frontend/tests/unit/modules/layout/application/itemInventoryProvenance.test.ts`
55. `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.itemInventoryDynamicAdd.test.ts`
56. `frontend/tests/unit/modules/scene/localDraftStore.test.ts`
57. `frontend/tests/regression-smoke/workspace/Workspace.item-inventory.regression-smoke.test.tsx`

---

## 8) Creatures

Status: `PARTIAL` (exact bounded Create + existing transform + retained
`ItemList`/`Equip_ItemList`/`SpecAbilityList`/identity and admitted advanced
controls)

Implemented now:
1. New `creatures` drafts carry the exact binary-free provenance for the
   admitted `nw_chicken.UTC` profile.
2. Factory and retained draft payload use the exact ResRef, Tag, profile,
   digest, GFF identity, and transform tuple.
3. Area Update resolves the immutable retail UTC and atomically appends exact
   paired type-`4` GIT/GIC entries with persisted readback verification.
4. The native mapper covers the observed 63-to-70 field materialization,
   orientation vector, 20-to-28 skill-list expansion, and empty equipment.
5. Existing native creature position and orientation-vector transforms remain
   supported through the shared object-mutation path.
6. Existing retained Creature `ItemList` replacement is implemented with exact
   immutable source ordinals, optimistic source-list comparison, retained full
   item-struct cloning, ordered add/remove/reorder, repository Word coordinates,
   and mode-`0` `Dropable`/`Pickpocketable` flags. The only admitted new entry is
   the hash-bound `nw_cloth022` UTI profile.
7. The frontend keeps the source list detached and immutable, validates the
   editable target at the workspace boundary, exposes `ItemList` as
   `ACTIVE_NOW` only for exact retained provenance, and keeps unproven list
   shapes visibly `PRESERVE_ONLY`. The Area Update transaction preserves the
   paired GIC and independently verifies the complete candidate readback.
8. Existing retained Creature `Equip_ItemList` replacement is implemented for
   the exact source-backed subset. The UI permits only removal and mode-`0`
   `Dropable`/`Pickpocketable` changes, keeps item identity and the 18 native
   slots immutable, orders output by slot mask, and supports one atomic
   inventory-plus-equipment mutation. Loose, aliased, duplicated, unsupported,
   or otherwise ambiguous equipment remains `PRESERVE_ONLY`.
9. Existing retained Creature `Tag : CExoString` replacement is implemented
   for one exact canonical field. The value is preserved verbatim (including
   empty and whitespace-containing strings), is limited to 32 UTF-16 code
   units without U+0000, and uses immutable expected/current CAS. Missing,
   duplicated, wrong-case, wrongly typed, stale, or malformed storage stays
   visibly `PRESERVE_ONLY`. `Tag`, `ItemList`, and `Equip_ItemList` may be
   committed together through one GIT mutation while GIC remains byte-identical.
10. Existing retained Creature `FirstName` and `LastName` exact
    `CExoLocString` storage is carried independently from the Area parser to
    the workspace and back into the transactional GIT writer. A member is
    `ACTIVE_NOW` only when its immutable source is inline `languageId=0`,
    printable ASCII, at most 256 bytes, and has no ambiguous extra entry;
    empty inline storage is also admitted. Surrounding spaces and an empty
    surname are written verbatim. TLK-backed, multilingual, nonzero-language,
    duplicated, non-ASCII, missing, malformed, or stale storage remains
    independently `PRESERVE_ONLY`. The writer applies `FirstName` before
    `LastName`, supports the same atomic mutation as `Tag`, `ItemList`, and
    `Equip_ItemList`, keeps GIC byte-identical, and verifies the complete
    candidate before publication.
11. Existing retained Creature `Conversation : ResRef` replacement is
    implemented for one exact presence-sensitive native field. Empty is a
    valid present source and target; uppercase legacy source bytes remain
    immutable comparison provenance, while edited targets must already be
    canonical lowercase `[a-z0-9_]{1,16}`. The frontend keeps provenance
    detached, exposes the control as `ACTIVE_NOW` only for an exact retained
    Creature ordinal, validates saved drafts, and never trims, case-folds, or
    truncates the value. Planning, exact GIT writer/readback, combined
    Tag/name/ItemList/Equip_ItemList mutation, atomic ARE/GIT/GIC/IFO
    publication, Apply/OK/Cancel/reopen, and local Save are verified offline.
12. Existing retained Creature `Interruptable : Byte` is independently
    presence-sensitive and mapped through the source-closed inverse control
    polarity `noInterrupt = Interruptable == 0`. Exact ordinal/CAS planning,
    field-only GIT write/readback, atomic publication with GIC/IFO identity,
    and the full dialog/local-draft regression are verified offline.
13. Existing retained Creature `Appearance_Type : Word` is bound to one exact
    effective `appearance.2da` identity, digest, row count, and physical row.
    The frontend selector and renderer receive only a catalog-admitted row;
    the backend revalidates the same table before field-only publication.
    Stale or unproven catalog/source state remains preserve-only.
14. Existing retained Creature `Disarmable`, `Plot`, `IsImmortal`, `Lootable`,
    and `NoPermDeath` native `Byte` fields are independently
    presence-sensitive and use direct checkbox polarity. Each control becomes
    editable only with one exact binary source field and immutable native
    ordinal. Subset projection, expected/current CAS, exact native writeback,
    complete-candidate verification, GIC/IFO identity, and
    Apply/OK/Cancel/reopen/local-Save behavior are verified offline. Creature
    `BodyBag`/`DecayTime` remain outside this boolean slice because the Toolset
    models them as a catalog selection plus decay controls; their separate
    authoring lane is item 15 below.
15. Existing retained Creature `BodyBag : Byte` and `DecayTime : DWord` are
    independently presence-sensitive. `BodyBag` is one digest/count-bound
    physical row from the effective `bodybag.2da`; `DecayTime` is an exact
    native millisecond value represented only as whole seconds `5..32767`.
    Both controls require their own immutable native provenance and current
    proven `Lootable=true`, but changing Lootable never synthesizes, clears, or
    normalizes either field. Projection, ordinal CAS planning, fresh catalog
    validation, paired write/readback, combined Lootable/BodyBag/DecayTime
    atomic publication, GIC/IFO identity, and
    Apply/OK/Cancel/reopen/local-Save are verified offline.
16. Existing retained Creature `FactionID : Word` is bound to one exact
    physical ordinal from the immutable module `repute.fac` identity. The
    frontend derives the display name from that catalog while the backend
    carries only the numeric native source/target pair and revalidates the
    digest and faction count before field-only publication. Missing, stale,
    out-of-range, or mismatched catalog/source state remains preserve-only.
17. Existing retained Creature `TemplateResRef : ResRef` is implemented for
    one exact canonical lowercase `[a-z0-9_]{1,16}` value. The immutable CAS
    source and Advanced-tab target are separate from `SceneObject.resRef`, UTC
    identity, palette identity, and appearance. HTTP, scene mapping, saved
    drafts, history cloning, guarded Apply/OK/reopen/local-Save, exact-ordinal
    planning, field-only write/readback, expected ARE publication, and
    byte-identical GIC/IFO are verified offline. Missing, empty, uppercase,
    duplicated, wrong-case, wrong-type, or otherwise malformed storage remains
    visibly `PRESERVE_ONLY`.
18. Existing retained Creature `Subrace : CExoString` and
    `Deity : CExoString` are independently presence-sensitive and use a
    bounded empty-or-printable-ASCII target profile of at most 256 code units.
    Each Advanced-tab input is `ACTIVE_NOW` only for its own exact retained
    type-`4` ordinal provenance; missing, duplicated, wrong-case, wrong-type,
    localized legacy, non-ASCII, control-character, or over-budget storage
    remains visibly `PRESERVE_ONLY`. Exact source/target CAS, field-only GIT
    write/readback, expected ARE publication, byte-identical GIC/IFO, detached
    HTTP/workspace/history state, and Apply/OK/reopen/local-Save are verified
    offline.
19. Existing retained Creature `Gender : Byte` is bound to one exact whole
    effective module/ordered-HAK/vanilla `gender.2da`, its immutable digest,
    row count, and physical row. The frontend uses numeric `genderId` as the
    only mutation identity, loads/searches only Toolset-admitted rows, and
    keeps stale, malformed, unbound, or unavailable catalog state visibly
    `PRESERVE_ONLY`. The backend reparses the exact Byte, freshly revalidates
    table identity and row admission, writes only `Gender`, verifies the full
    candidate, and preserves the paired GIC and unrelated fields. The previous
    hardcoded English `None/Male/Female/Both` list is no longer persistence
    authority. The complete Area Update atomic-publication integration file,
    full Creature-properties regression file, scene-normalization coverage,
    focused backend/frontend suites, and both production builds are green.
    Browser and native certification remain open.
20. Existing retained Creature script-event `ResRef` fields are implemented
    as thirteen independent, presence-sensitive CAS members in canonical
    native order. Each Scripts-tab input is `ACTIVE_NOW` only for its own exact
    retained type-`4` ordinal provenance; missing, duplicated, wrong-case,
    wrong-type, malformed, or absent fields remain visibly
    `PRESERVE_ONLY`. Canonical lowercase-or-empty targets, strict HTTP and
    workspace state, detached history, guarded reducer and Apply,
    Apply/OK/reopen/local-Save, exact-ordinal planning, field-only GIT
    write/readback, expected ARE publication, and byte-identical GIC/IFO are
    verified offline. Browser and native certification remain open.
21. Existing retained Creature `ChallengeRating : Float` is implemented as one
    exact presence-sensitive CAS member. The source is admitted only from one
    canonical type-`4` ordinal field; malformed, missing, duplicated,
    wrong-case, wrong-type, non-finite, negative, over-budget, negative-zero,
    or stale state is visibly `PRESERVE_ONLY`. Requested decimals are
    normalized once to IEEE-754 binary32, only the existing native Float is
    replaced, and GIC/IFO plus all sibling GIT fields remain unchanged. Strict
    HTTP/workspace/history state, Basic and Advanced UI gating, guarded draft
    reduction/final Apply, Apply/OK/reopen/local-Save, exact-ordinal planning,
    candidate readback, and atomic publication are verified offline.
    `CRAdjust` is explicitly disabled and `PRESERVE_ONLY`. Its signed
    `-125..125` Toolset input and native `INT` storage are source-closed, but a
    native edit invokes the complete Creature CR calculator and rewrites
    `ChallengeRating`; that calculator and its coupled two-field mutation are
    not yet implemented. Browser and native certification remain open.
22. Existing retained Creature `Str`, `Dex`, `Con`, `Int`, `Wis`, and `Cha`
    base-score `Byte` fields are implemented as six independently
    presence-sensitive CAS members. A field is `ACTIVE_NOW` only for one exact
    canonical type-`4` ordinal member with an integer value in `0..255`;
    missing, duplicated, wrong-case, wrong-type, malformed, or stale members
    remain visibly `PRESERVE_ONLY`. Strict HTTP/workspace/history validation,
    per-member UI gating, guarded reduction and materialization,
    Apply/OK/reopen/local-Save, native-order subset planning, field-only GIT
    write/readback, expected ARE publication, and byte-identical GIC/IFO are
    verified offline. New or seed Creature drafts retain bounded base-score
    authoring without claiming existing native provenance. Racial modifiers
    and derived totals remain disabled and preserve-only. Browser and native
    certification remain open.
23. Existing retained Creature `NaturalAC : Byte` is implemented as one exact,
    presence-sensitive CAS member. A retained control is `ACTIVE_NOW` only for
    one canonical type-`4` ordinal field with an integer value in `0..255`;
    missing, duplicated, wrong-case, wrong-type, malformed, or stale storage
    remains visibly `PRESERVE_ONLY`. New and seed Creature drafts retain
    storage-safe `0..255` authoring without claiming retained provenance. The
    frontend carries detached source state through HTTP, workspace history,
    guarded reduction, Apply/OK/reopen, and local Save. The backend performs
    exact-ordinal planning, writes only `NaturalAC`, verifies candidate
    readback, and preserves GIC/IFO and unrelated GIT fields byte-for-byte.
    Base AC, Dexterity Bonus, Size Modifier, and Total AC remain disabled and
    preserve-only because they are presentation or derived values rather than
    independently proven persisted fields. Browser and native certification
    remain open.
24. Existing retained Creature `fortbonus`, `refbonus`, and `willbonus`
    `Short` fields are implemented as three independently presence-sensitive
    CAS members. Each Bonus input is `ACTIVE_NOW` only for its own exact
    lowercase native field on one canonical retained type-`4` ordinal and an
    integer source/target in the Toolset edit interval `0..250`; absent,
    duplicated, wrong-case, wrong-type, out-of-range, malformed, or stale
    storage remains visibly `PRESERVE_ONLY`. Strict HTTP/workspace/history
    state, guarded reduction and final Apply, Apply/OK/reopen/local-Save,
    native-order subset planning (`reflex`, `will`, `fortitude`), field-only
    GIT write/readback, expected ARE publication, and byte-identical GIC/IFO
    are verified offline. Base saves, ability modifiers, totals, progression,
    feats, effects, and runtime saving-throw behavior remain presentation or
    preserve-only. Browser and native certification remain open.
25. Existing retained Creature `GoodEvil : Byte` and
    `LawfulChaotic : Byte` are implemented as one coupled canonical alignment
    mutation. The nine exact Toolset labels map only to axis values
    `{0, 50, 100}`; both native fields must be present exactly once on the same
    retained type-`4` ordinal before the selector becomes `ACTIVE_NOW`.
    Partial, absent, duplicated, wrong-case, wrong-type, intermediate legacy,
    malformed, or stale storage remains visibly `PRESERVE_ONLY` and is never
    normalized. Strict HTTP/workspace/history state, detached provenance,
    centralized label mapping, guarded reducer and final Apply,
    Apply/OK/reopen/local-Save, full-pair CAS planning, two-Byte-only GIT
    write/readback, expected ARE publication, and byte-identical GIC/IFO are
    verified offline. Browser, Toolset Save/Build/reopen, and NWN runtime
    certification remain open.
26. Existing retained Creature `PortraitId : Word` is implemented as one
    exact, catalog-bound physical-row CAS member. The shared effective
    `portraits.2da` catalog uses module/ordered-HAK/vanilla first-hit
    precedence and retains exact `BaseResRef`, `Sex`, `Race`, `Plot`, digest,
    row count, and sparse physical ordinals. Admission mirrors the native
    selector: `Plot == 0`, Race `4` accepts portrait Race `6` or `1`, and
    Creature Race above `6` forces effective portrait Sex row `4`; all other
    races use the retained Gender byte. Numeric `portraitId` and derived
    `portraitResRef` change atomically. Loose ResRefs, legacy
    `Portrait : ResRef`, stale or unbound tables, malformed storage, and a
    simultaneous Gender mutation remain visibly `PRESERVE_ONLY`. Exact
    ordinal planning, fresh compiler admission, canonical Word-only GIT
    writing/readback, cache identity, and byte-identical paired GIC are
    implemented. Both production builds, 2,256 focused backend assertions,
    679 focused frontend assertions, the complete 60-test Area Update
    integration suite, and the complete 17-test Creature-properties Workspace
    regression suite are green. Browser and native certification remain open.
27. Existing retained Creature `HitPoints`, `CurrentHitPoints`, and
    `MaxHitPoints` `Short` fields are implemented as one coupled mutation with
    the base `Con : Byte`. Activation requires all three canonical HP fields,
    exact Constitution and Race Bytes, at most eight `ClassList` levels with a
    total no greater than 180, the row-40 feat dependency, and one complete
    effective `racialtypes.2da` source selected by module/ordered-HAK/vanilla
    first-hit precedence. The UI exposes bounded Base HP and Constitution only;
    Hit Point Bonuses, Current HP, and Max HP are derived, read-only values.
    The native signed Constitution modifier, per-level bonus, row-40 bonus,
    minimum Base HP, maximum HP, and current-HP transition are shared by the
    frontend and backend domains, including negative bonuses without clamping.
    Missing, duplicated, wrong-case, wrong-type, malformed, incomplete, stale,
    or unbound provenance remains visibly `PRESERVE_ONLY`. Strict
    HTTP/workspace/history validation, detached cloning, guarded coupled
    reduction, Apply/OK/reopen/local-Save, full dependency CAS planning, fresh
    racial-table admission, canonical GIT write/readback, revision-fenced
    atomic publication, and byte-identical GIC/IFO are verified offline.
    Browser, Toolset Save/Build/reopen, and NWN runtime certification remain
    open.
28. Existing retained Creature class identity is implemented offline through
    two disjoint exact profiles. The same-roster profile permits a combined
    `Class : Int` plus `ClassLevel : Short` change, clears canonical
    `KnownList0..13` and `MemorizedList0..13` only for changed class IDs, and
    atomically derives the coupled HP triplet. The slot-count profile follows
    the recovered native selector state machine: one contiguous non-empty
    prefix of `1..8` slots, append at the tail, or truncate at the tail. Every
    retained prefix slot keeps its class ID, level, ordered spell graph, and
    opaque siblings; appended type-`2` structs contain canonical `Class : Int`
    and `ClassLevel : Short` only; truncation requires an explicit destructive
    removal confirmation. Both profiles require unique admitted physical rows
    of one exact effective `classes.2da`, an admitted target
    `StartingPackage : Byte` from the same effective `packages.2da`, an exact
    canonical graph fingerprint, and complete class-level/racial/HP
    provenance. HTTP, scene, workspace/history, catalog facades, guarded
    materialization, compiler admission, raw-GIT replanning, typed writing,
    candidate readback, and transactional ARE/GIT/GIC/IFO publication are
    implemented. Bounded verification passes `46/46` focused backend,
    `64/64` Area Update integration, `635/635` focused frontend, the complete
    `21/21` Creature Properties regression, `13/13` capability-catalog
    assertions, and both production builds. Middle
    insertion/deletion, reorder, simultaneous resize plus retained-prefix
    mutation, arbitrary known/memorized spell authoring, guarded browser
    readback, Toolset Save/Build/reopen, and NWN behavior proof remain open.
29. Existing retained Creature `Color_Skin`, `Color_Hair`, `Color_Tattoo1`,
    and `Color_Tattoo2` `Byte` fields are implemented as four independently
    presence-sensitive CAS members. Strict HTTP/workspace/history storage,
    guarded per-member reduction, Apply/OK/reopen/local-Save, exact type-`4`
    ordinal planning, subset GIT write/readback, and atomic publication are
    verified offline. Missing, duplicated, wrong-case, wrong-type, malformed,
    stale, or target-only members remain visibly `PRESERVE_ONLY`; new drafts
    retain bounded `0..255` authoring without claiming retained provenance.
30. Existing retained part-based Creature head and body slots are implemented
    through 19 independently presence-sensitive compatibility pairs. The exact
    legacy `BYTE` and `x`-prefixed `WORD` shapes are preserved; an existing
    word is authoritative, a byte-only source stays bounded to `0..255`, and
    byte-plus-word targets above `255` receive Aurora's canonical legacy-byte
    value `0`. No absent member is synthesized or removed. Strict HTTP,
    detached scene/draft/history provenance, per-source UI capacity, guarded
    materialization, immutable-ordinal subset CAS, exact field-only writing,
    candidate readback, and transactional ARE/GIT/GIC/IFO publication are
    verified offline. `BodyPart_Robe` is not Creature storage; native robe
    authoring belongs to `ArmorPart_Robe` on an equipped armor Item. Wings,
    tail, and part-model availability remain outside this storage contract. Browser renderer readback, Toolset
    Save/Build/reopen, packed dual-field readback, and NWN behavior remain open.
31. Existing retained Creature `Wings_New : DWord` and `Tail_New : DWord` are
    implemented as two independent catalog-bound CAS members. Aurora's exact
    modern-over-legacy read precedence is retained: legacy `Wings : Byte` and
    `Tail : Byte` remain visible but preserve-only, while a modern member is
    editable only when its physical row belongs to the current complete
    effective `wingmodel.2da` or `tailmodel.2da`. HTTP, detached scene/draft/
    history state, bounded catalog ports/facades, independent dialog search
    and selection, fresh compiler admission, immutable-ordinal planning,
    DWord-only GIT writing, candidate readback, and transactional ARE/GIT/GIC/
    IFO publication are verified offline. Legacy siblings and unrelated bytes
    remain preserved. The dynamic UTC writer now emits both modern fields as
    native DWords. Browser model readback, Toolset Save/Build/reopen, packed
    field inspection, and NWN visual behavior remain open.
32. Existing retained Creature `SpecAbilityList` is implemented for one exact,
    canonical, sibling-free type-`4` physical list. The source retains physical
    order, duplicates, flags, caster bytes, and immutable effective
    `spells.2da` provenance. The UI groups duplicates into one row with native
    `1..255` uses, applies the recovered Toolset coupling (`uses=0` clears the
    caster level, active Spells use `1..15`, Monster Abilities use `0`), and
    materializes output in physical catalog order. Only localized physical rows
    with `UserType` `1|2` and empty/`****` `Master` are admitted. Strict HTTP,
    detached scene/draft/history state, complete catalog paging, fail-closed
    Apply, raw-GIT ordinal CAS, fresh compiler admission, repeated canonical
    type-`4` writing, candidate readback, and transactional ARE/GIT/GIC/IFO
    publication are verified offline. Noncanonical order/flags/levels,
    noncontiguous duplicates, opaque siblings, hidden/unlocalized rows, stale
    tables, and unavailable catalogs remain `PRESERVE_ONLY`. Browser, Toolset,
    packed-GIT, and NWN behavior proof remain open.
33. Existing retained Creature `PerceptionRange : Byte` is implemented as an
    exact catalog-bound CAS against Toolset-admitted physical rows `8..11` of
    the complete effective `ranges.2da`. Missing storage and Appearance-derived
    presentation fallback remain preserve-only.
34. Existing retained Creature `WalkRate : Int` is implemented as an exact
    catalog-bound CAS against complete positive physical rows of the effective
    `creaturespeed.2da`; physical row `0`, missing-field `MOVERATE` fallback,
    stale identity, and malformed storage remain preserve-only.
35. Existing retained Creature `SoundSetFile : Word` is implemented with
    strongest-whole `soundset.2da` provenance, physical-row identity, fresh
    compiler admission, exact field-only write/readback, and detached frontend
    catalog selection.
36. Existing retained Creature `StartingPackage : Byte` is implemented as a
    class-filtered physical `packages.2da` row. It requires exact existing
    storage plus a complete canonical ClassList and never treats the legacy
    checkbox or a label as persistence authority.
37. Existing retained Creature `SkillList` is implemented as a complete
    positional `Rank : Byte` vector bound to the effective `skills.2da` row
    count. Hidden rows retain their physical positions, growth uses a zero
    tail, and truncation requires explicit confirmation.
38. Existing retained Creature `FeatList` is implemented as an exact unique
    set of physical `feat.2da` Word identities with complete CAS, fresh
    catalog admission, row-40 HP coupling, and fail-closed handling of hidden,
    duplicate, opaque, or destructive category-4 removal cases.
39. Existing retained Creature `VarTable` is implemented as an exact ordered
    table supporting duplicate names and native Int/Float/CExoString entries.
    Add, typed edit, remove, reorder, exact empty-table removal, candidate
    readback, and transactional publication are verified offline.
40. Existing retained Creature `Phenotype : Int` is implemented as a
    catalog-bound physical-row CAS for part-based Appearance rows. Row `1`,
    simultaneous Appearance changes, stale/unbound tables, and non-part-based
    appearances remain preserve-only; renderer cache identity follows the
    admitted phenotype.
41. Creature robe ownership is corrected end to end. The HTTP Creature
    blueprint contract rejects `bodyPartRobe`, the UTC serializer never emits
    `BodyPart_Robe`, generic UTC and Area GIT Creature parsing do not promote
    rogue robe fields, and the creation wizard never projects loose legacy
    robe metadata. `ArmorPart_Robe : Word` on UTI/equipped armor remains intact
    for Item parsing, writing, rendering, and preservation.

Not implemented yet:
1. Arbitrary creature-template Create.
2. Remaining Creature identity beyond exact `Tag`, bounded retained
   `FirstName`/`LastName`, exact retained `Conversation`, admitted
   `Appearance_Type`, catalog-bound `Gender`, `PortraitId`, and `FactionID`, and
   canonical `TemplateResRef`, `Subrace`, `Deity`, and exact present script
   ResRefs; statistics other than exact retained `ChallengeRating`, exact
   retained `NaturalAC`, the coupled retained HP triplet/base Constitution lane,
   the six exact retained base-score Bytes, the exact retained
   `fortbonus`/`refbonus`/`willbonus` Shorts, and the coupled canonical
   `GoodEvil`/`LawfulChaotic` alignment pair (including `CRAdjust`, racial
   modifiers beyond the implemented HP calculation, derived armor totals,
   base/ability/total save calculations), class-slot reorder
   or middle insertion/deletion, simultaneous resize plus retained-prefix
   mutation, arbitrary known/memorized spell authoring,
   creation/removal of absent native script or base-score fields,
   script-source compilation,
   arbitrary inventory blueprints, nested item property authoring, random
   inventory/equipment, new equipment admission, slot reassignment, and
   item-slot compatibility authoring.
3. Fresh exact-candidate Toolset Save/Build/reopen and NWN certification.

Evidence in repo:
1. `frontend/src/modules/scene/domain/areaWaypointConstructionProfile.ts`
2. `frontend/tests/unit/modules/scene/sceneFactory.test.ts`
3. `frontend/tests/unit/modules/scene/domain/areaWaypointConstructionProfile.test.ts`
4. `backend/docs/aurora-reverse/area-creature-construction-audit-v1-2026-08-13.md`
5. `backend/docs/aurora-reverse/area-existing-creature-item-list-audit-v1-2026-08-26.md`
6. `backend/src/modules/areas/domain/area-creature-inventory.ts`
7. `frontend/src/modules/scene/domain/creatureInventory.ts`
8. `frontend/tests/unit/modules/scene/domain/creatureInventory.test.ts`
9. `backend/docs/aurora-reverse/area-existing-creature-body-bag-decay-time-audit-v1-2026-08-27.md`
10. `backend/src/modules/areas/domain/area-creature-death-remains.ts`
11. `frontend/src/modules/scene/domain/creatureDeathRemains.ts`
12. `frontend/tests/regression-smoke/workspace/Workspace.creature-properties.regression-smoke.test.tsx`
9. `frontend/tests/regression-smoke/workspace/Workspace.creature-properties.regression-smoke.test.tsx`
10. `backend/docs/aurora-reverse/area-existing-creature-equip-item-list-audit-v1-2026-08-26.md`
11. `backend/src/modules/areas/domain/area-creature-equipment.ts`
12. `frontend/src/modules/scene/domain/creatureEquipment.ts`
13. `frontend/tests/unit/modules/scene/domain/creatureEquipment.test.ts`
14. `frontend/tests/unit/modules/layout/application/creatureEquipmentProvenance.test.ts`
15. `output/proof/area-existing-creature-equip-item-list-offline-audit-2026-08-26/verification.json`
16. `backend/docs/aurora-reverse/area-existing-creature-tag-audit-v1-2026-08-26.md`
17. `backend/src/modules/areas/domain/area-creature-tag.ts`
18. `frontend/src/modules/scene/domain/creatureTag.ts`
19. `frontend/src/modules/layout/application/creatureTagProvenance.ts`
20. `backend/test/integration/area-update-atomic-publication.spec.ts`
21. `frontend/tests/regression-smoke/workspace/Workspace.creature-properties.regression-smoke.test.tsx`
22. `output/proof/area-existing-creature-tag-offline-audit-2026-08-26/verification.json`
23. `backend/docs/aurora-reverse/area-existing-creature-name-localized-string-mutation-audit-v1-2026-08-26.md`
24. `backend/src/modules/areas/domain/area-creature-localized-strings.ts`
25. `backend/src/modules/areas/domain/area-creature-localized-string-mutation.ts`
26. `frontend/src/modules/scene/domain/creatureNameLocalizedStrings.ts`
27. `frontend/src/modules/layout/application/creatureLocalizedStringProvenance.ts`
28. `frontend/tests/unit/modules/areas/areaSceneMapper.test.ts`
29. `frontend/tests/unit/modules/areas/areaWorkspaceDraft.test.ts`
30. `frontend/tests/unit/modules/layout/components/properties/CreaturePropertiesDialog.test.tsx`
31. `backend/docs/aurora-reverse/area-existing-creature-conversation-audit-v1-2026-08-27.md`
32. `backend/src/modules/areas/domain/area-creature-conversation.ts`
33. `frontend/src/modules/scene/domain/creatureConversation.ts`
34. `frontend/src/modules/layout/application/creatureConversationProvenance.ts`
35. `backend/docs/aurora-reverse/area-existing-creature-interruptable-audit-v1-2026-08-27.md`
36. `backend/docs/aurora-reverse/area-existing-creature-appearance-audit-v1-2026-08-27.md`
37. `backend/docs/aurora-reverse/area-existing-creature-advanced-flags-audit-v1-2026-08-27.md`
38. `backend/src/modules/areas/domain/area-creature-advanced-flags.ts`
39. `frontend/src/modules/scene/domain/creatureAdvancedFlags.ts`
40. `frontend/src/modules/layout/application/creatureAdvancedFlagsProvenance.ts`
41. `backend/test/integration/area-update-atomic-publication.spec.ts`
42. `backend/docs/aurora-reverse/area-existing-creature-faction-audit-v1-2026-08-27.md`
43. `backend/src/modules/areas/domain/area-creature-faction.ts`
44. `frontend/src/modules/scene/domain/creatureFaction.ts`
45. `frontend/src/modules/layout/application/creatureFactionProvenance.ts`
46. `backend/docs/aurora-reverse/area-existing-creature-template-resref-audit-v1-2026-08-27.md`
47. `backend/src/modules/areas/domain/area-creature-template-resref.ts`
48. `frontend/src/modules/scene/domain/creatureTemplateResRef.ts`
49. `frontend/src/modules/layout/application/creatureTemplateResRefProvenance.ts`
50. `backend/docs/aurora-reverse/area-existing-creature-subrace-deity-audit-v1-2026-08-27.md`
51. `backend/src/modules/areas/domain/area-creature-special-identity-strings.ts`
52. `frontend/src/modules/scene/domain/creatureSpecialIdentityStrings.ts`
53. `frontend/src/modules/layout/application/creatureSpecialIdentityStringsProvenance.ts`
54. `backend/docs/aurora-reverse/area-existing-creature-gender-audit-v1-2026-08-27.md`
55. `backend/src/modules/catalog/domain/effective-creature-gender-two-da.ts`
56. `backend/src/modules/areas/domain/area-creature-gender.ts`
57. `backend/src/modules/areas/application/area-creature-gender-catalog-admission.ts`
58. `frontend/src/modules/scene/domain/creatureGender.ts`
59. `frontend/src/modules/layout/application/creatureGenderProvenance.ts`
60. `frontend/tests/unit/modules/layout/components/properties/CreaturePropertiesDialog.test.tsx`
61. `backend/docs/aurora-reverse/area-existing-creature-script-resrefs-audit-v1-2026-08-27.md`
62. `backend/src/modules/areas/domain/area-creature-script-resrefs.ts`
63. `frontend/src/modules/scene/domain/creatureScriptResRefs.ts`
64. `frontend/src/modules/layout/application/creatureScriptResRefsProvenance.ts`
65. `backend/docs/aurora-reverse/area-existing-creature-challenge-rating-audit-v1-2026-08-27.md`
66. `backend/src/modules/areas/domain/area-creature-challenge-rating.ts`
67. `frontend/src/modules/scene/domain/creatureChallengeRating.ts`
68. `frontend/src/modules/layout/application/creatureChallengeRatingProvenance.ts`
69. `backend/docs/aurora-reverse/area-existing-creature-ability-scores-audit-v1-2026-08-27.md`
70. `backend/src/modules/areas/domain/area-creature-ability-scores.ts`
71. `frontend/src/modules/scene/domain/creatureAbilityScores.ts`
72. `frontend/src/modules/layout/application/creatureAbilityScoresProvenance.ts`
73. `backend/docs/aurora-reverse/area-existing-creature-challenge-rating-adjustment-audit-v1-2026-08-28.md`
74. `backend/docs/aurora-reverse/area-existing-creature-natural-armor-class-audit-v1-2026-08-28.md`
75. `backend/src/modules/areas/domain/area-creature-natural-armor-class.ts`
76. `frontend/src/modules/scene/domain/creatureNaturalArmorClass.ts`
77. `frontend/src/modules/layout/application/creatureNaturalArmorClassProvenance.ts`
78. `backend/docs/aurora-reverse/area-existing-creature-saving-throw-bonuses-audit-v1-2026-08-28.md`
79. `backend/src/modules/areas/domain/area-creature-saving-throw-bonuses.ts`
80. `frontend/src/modules/scene/domain/creatureSavingThrowBonuses.ts`
81. `frontend/src/modules/layout/application/creatureSavingThrowBonusesProvenance.ts`
82. `backend/docs/aurora-reverse/area-existing-creature-alignment-audit-v1-2026-08-28.md`
83. `backend/src/modules/areas/domain/area-creature-alignment.ts`
84. `frontend/src/modules/scene/domain/creatureAlignment.ts`
85. `frontend/src/modules/layout/application/creatureAlignmentProvenance.ts`
86. `backend/docs/aurora-reverse/area-existing-creature-portrait-id-audit-v1-2026-08-28.md`
87. `backend/src/modules/catalog/domain/effective-creature-portraits-two-da.ts`
88. `backend/src/modules/areas/domain/area-creature-portrait.ts`
89. `frontend/src/modules/scene/domain/creaturePortrait.ts`
90. `frontend/src/modules/layout/application/creaturePortraitProvenance.ts`
91. `backend/docs/aurora-reverse/area-existing-creature-class-list-audit-v1-2026-08-28.md`
92. `backend/src/modules/areas/domain/area-creature-class-identity.ts`
93. `backend/src/modules/areas/application/area-creature-class-identity-catalog-admission.ts`
94. `frontend/src/modules/scene/domain/creatureClassIdentity.ts`
95. `frontend/src/modules/layout/application/creatureClassIdentityProvenance.ts`
96. `frontend/tests/unit/modules/layout/application/creatureClassIdentityProvenance.test.ts`
97. `backend/docs/aurora-reverse/area-existing-creature-appearance-colors-audit-v1-2026-09-02.md`
98. `backend/docs/aurora-reverse/area-existing-creature-body-parts-audit-v1-2026-09-02.md`
99. `backend/src/modules/areas/domain/area-creature-body-parts.ts`
100. `frontend/src/modules/scene/domain/creatureAppearanceColors.ts`
101. `frontend/src/modules/scene/domain/creatureBodyParts.ts`
102. `frontend/src/modules/layout/application/creatureAppearanceColorsProvenance.ts`
103. `frontend/src/modules/layout/application/creatureBodyPartProvenance.ts`
104. `backend/docs/aurora-reverse/area-existing-creature-wings-tail-audit-v1-2026-09-02.md`
105. `backend/src/modules/catalog/domain/effective-creature-appendage-two-da.ts`
106. `backend/src/modules/areas/domain/area-creature-appendages.ts`
107. `backend/src/modules/areas/application/area-creature-appendage-catalog-admission.ts`
108. `frontend/src/modules/scene/domain/creatureAppendages.ts`
109. `frontend/src/modules/layout/application/creatureAppendageProvenance.ts`
110. `frontend/src/modules/creatures/application/creatureAppendageCatalogFacade.ts`

---

## 9) Stores

Status: `PARTIAL` (exact bounded Create + existing transform + retained Comment,
complete commerce-vector CAS, script-ResRef CAS, and ordered VarTable CAS)

Implemented now:
1. New `stores` drafts carry the exact binary-free provenance for the admitted
   `x2_merc_dye.UTM` profile.
2. Factory and retained draft payload use the exact ResRef, Tag, profile,
   digest, GFF identity, and transform tuple.
3. Area Update resolves the immutable retail UTM and its exact ordered closure
   of 55 UTI resources, then atomically appends paired type-`11` GIT/GIC entries
   with persisted readback verification.
4. The native mapper expands every inventory reference into the observed full
   embedded item instance and records dependency count and ordered-set digest
   in the mutation receipt.
5. Existing native store position and orientation-vector transforms remain
   supported through the shared object-mutation path.
6. Existing ordinal-paired GIC `Comment : CExoString` is admitted, detached,
   edited, and atomically published through exact compare-and-swap. The
   frontend exposes this verified subset in Store Properties, retains
   immutable source provenance, supports Apply/Cancel/OK/reopen, and keeps the
   logical Store action reachable without requiring a canvas mesh.
7. Existing retained type-`11` Stores with all seven exact native commerce
   fields expose detached source/target values for `MarkUp`, `MarkDown`,
   `BlackMarket`, `BM_MarkDown`, `IdentifyPrice`, `MaxBuyPrice`, and
   `StoreGold`. Backend projection, immutable-ordinal planning, full-vector
   compare-and-swap, exact GIT mutation/readback, and atomic candidate
   compilation preserve GIC, IFO, field ordering, and unrelated GIT members.
   The Store Properties dialog enables commerce only when the complete exact
   vector is present; partial or malformed source state remains preserve-only.
8. Existing retained type-`11` Stores with exactly one `OnOpenStore : ResRef`
   and one `OnStoreClosed : ResRef` expose a detached, all-or-nothing script
   pair. Backend projection, immutable-ordinal planning, complete-pair CAS,
   exact GIT mutation/readback, and atomic candidate compilation preserve GIC,
   IFO, field ordering, and unrelated GIT members. Store Properties exposes
   two canonical lowercase ResRef controls only with complete source/target
   authority; Apply/Cancel/OK/reopen and local-draft persistence are covered.
9. Existing retained type-`11` Stores expose the exact ordered native
   `VarTable` through shared Int/Float/String semantics. Backend parsing,
   detached snapshot provenance, immutable-ordinal planning, complete-table
   compare-and-swap, exact GIT mutation/readback, and atomic compilation
   preserve GIC, IFO, restrictions, inventory, identity, ordering, and every
   unrelated GIT member. Store Properties provides add/edit/remove/reorder only
   for complete source provenance, with workspace, clone, local-draft, and
   Apply/Cancel/OK/reopen coverage; malformed or unsupported state remains
   preserve-only.

Not implemented yet:
1. Arbitrary store-template Create.
2. Store restrictions, editable inventory, and other unsupported
   UTM/native-instance fields. Script compilation/resource creation remains a
   separate capability from the implemented retained script-ResRef binding.
3. Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen, and NWN
   certification.

Evidence in repo:
1. `frontend/src/modules/scene/domain/areaWaypointConstructionProfile.ts`
2. `frontend/tests/unit/modules/scene/sceneFactory.test.ts`
3. `frontend/tests/unit/modules/scene/domain/areaWaypointConstructionProfile.test.ts`
4. `backend/docs/aurora-reverse/area-store-construction-audit-v1-2026-08-13.md`
5. `backend/docs/aurora-reverse/area-existing-store-editor-comment-audit-v1-2026-08-30.md`
6. `frontend/src/modules/layout/application/storePropertiesDraft.ts`
7. `frontend/src/modules/layout/components/properties/StorePropertiesDialog.tsx`
8. `frontend/tests/regression-smoke/workspace/Workspace.store-properties.regression-smoke.test.tsx`
9. `backend/docs/aurora-reverse/area-existing-store-commerce-audit-v1-2026-08-30.md`
10. `backend/src/modules/areas/domain/area-store-commerce.ts`
11. `backend/test/unit/area-store-commerce.spec.ts`
12. `backend/test/unit/area-store-commerce-parser.spec.ts`
13. `frontend/src/modules/scene/domain/storeCommerce.ts`
14. `frontend/tests/unit/modules/scene/storeCommerce.test.ts`
15. `backend/docs/aurora-reverse/area-existing-store-script-resrefs-audit-v1-2026-08-30.md`
16. `backend/src/modules/areas/domain/area-store-script-resrefs.ts`
17. `backend/test/unit/area-store-script-resrefs.spec.ts`
18. `backend/test/unit/area-store-script-resrefs-parser.spec.ts`
19. `frontend/src/modules/scene/domain/storeScriptResRefs.ts`
20. `frontend/tests/unit/modules/scene/domain/storeScriptResRefs.test.ts`
21. `backend/docs/aurora-reverse/area-existing-store-variable-table-audit-v1-2026-08-30.md`
22. `backend/src/modules/areas/domain/area-store-variable-table.ts`
23. `backend/test/unit/area-store-variable-table.spec.ts`
24. `backend/test/unit/area-store-variable-table-parser.spec.ts`
25. `frontend/src/modules/scene/domain/storeVariableTable.ts`
26. `frontend/tests/unit/modules/scene/domain/storeVariableTable.test.ts`

---

## 10) Triggers

Status: `PARTIAL` (exact bounded Create + existing position, polygon, Tag,
TemplateResRef, inline LocalizedName, paired-GIC editor Comment, and complete
event-script ResRef tuple update)

Implemented now:
1. New `triggers` drafts carry the exact binary-free provenance for the
   admitted `newgeneric.UTT` profile.
2. Factory and local-draft round-trip retain the exact ResRef, Tag, profile,
   digest, GFF identity, origin, and zero bearing.
3. Area Update resolves the immutable retail UTT and atomically appends exact
   paired type-`1` GIT/GIC entries with persisted readback verification.
4. The backend owns the accepted four-point local type-`3` polygon and emits
   the native 34-field instance profile; client geometry and nonzero bearing
   fail closed.
5. Existing native trigger origin transforms preserve complete geometry,
   orientation and every unrelated field through the shared object-mutation
   path.
6. Retained source-provenant Trigger polygons expose an ordered native-local
   point editor and a closed Three.js guide. Area Update replaces the complete
   type-`3` `Geometry` list through family/ordinal-bound float32 CAS, exact
   candidate/persisted readback, and atomic publication while preserving
   origin, orientation, paired GIC, and every unrelated resource.
7. Retained type-`1` Trigger `Tag : CExoString` is independently editable only
   from exact immutable presence-sensitive provenance. The value is preserved
   byte-for-text exactly, including empty or whitespace-bearing strings, with a
   32 UTF-16-code-unit limit and no trim, normalization, case folding, alias,
   or field synthesis. The Trigger Properties dialog, workspace draft,
   detached history, local Save, export, ordinal CAS planner, GFF writer,
   candidate readback, and atomic publication share the same fail-closed
   contract. A Tag-only publication preserves complete GIC and IFO bytes.
8. Trigger and Encounter logical property dialogs remain addressable from the
   object list when their canvas overlays are hidden; overlay visibility no
   longer opens and immediately closes a valid property dialog.
9. Retained type-`1` Trigger `TemplateResRef : ResRef` is independently
   editable from one exact canonical present same-ordinal GIT field. The
   `[a-z0-9_]{1,16}` compare-and-swap changes only the retained instance,
   preserves renderer/catalog `SceneObject.resRef`, complete GIC, and every
   unrelated field, and survives Apply, Cancel, reopen, OK, and local Save.
   Missing, duplicated, wrongly typed, noncanonical, or stale storage remains
   visibly `PRESERVE_ONLY`; UTT mutation and Toolset update-instances behavior
   are not implied.
10. Retained type-`1` Trigger `LocalizedName : CExoLocString` is independently
    editable only for one exact inline `strRef=0xffffffff`, language-`0`,
    printable-ASCII profile bounded to 256 bytes. Complete native storage is
    retained under immutable source provenance while the editable target stays
    separate from renderer/catalog identity. The exact ordinal-bound CAS
    changes only the existing field and composes atomically with Tag,
    TemplateResRef, polygon, and companion preservation. TLK-backed retail
    names (including `newgeneric.UTT` `strRef=14759`), multilingual, absent,
    malformed, duplicate, non-ASCII, or stale storage remains visibly
    `PRESERVE_ONLY`. Apply, Cancel, reopen, OK, and local Save retain the exact
     source value.
11. Retained type-`1` Trigger paired-GIC `Comment : CExoString` is independently
    editable only from one exact same-ordinal `TriggerList` pair with equal
    cardinality and an already-present exact field. Source and target preserve
    empty strings, whitespace, CR/LF, and Unicode code units exactly, with a
    4,096-code-unit limit and no NUL, normalization, truncation, field
    synthesis, or UTT fallback. The HTTP boundary, mapper, immutable source,
    workspace draft/history, Trigger Properties Comments control, facade/port,
    projector, ordinal CAS planner, paired writer, candidate/persisted readback,
    and atomic publication share that fail-closed contract. A comment-only
    update preserves GIT, ARE, and IFO bytes; the combined transaction composes
    with Tag and LocalizedName. This editor-only field makes no NWN runtime-
    behavior claim.
12. Retained type-`1` Trigger event scripts expose one complete immutable-
    source and editable-target tuple for the exact fields `OnDisarm`,
    `OnTrapTriggered`, `OnClick`, `ScriptHeartbeat`, `ScriptOnEnter`,
    `ScriptOnExit`, and `ScriptUserDefine`. Existing source ResRefs may retain
    mixed ASCII case; the first real write follows the native writer and
    lowercases every non-empty target member. Partial, absent, duplicate,
    wrong-case, wrong-type, malformed, stale, or unchanged tuples cannot
    authorize mutation. Apply, Cancel, reopen, OK, local Save, exact ordinal
    CAS, whole-candidate/persisted readback, and atomic ARE/GIT/GIC/IFO
    publication are verified offline. Script existence, compilation, dispatch,
    cadence, ordering, trap behavior, and activation remain separate gates.

Not implemented yet:
1. Arbitrary trigger-template Create.
2. Rotation, remaining properties, links, variables, and runtime activation
   authoring.
3. Fresh exact-candidate Toolset Save/Build/reopen and NWN certification.

Evidence in repo:
1. `frontend/src/modules/scene/domain/areaWaypointConstructionProfile.ts`
2. `frontend/tests/unit/modules/scene/sceneFactory.test.ts`
3. `frontend/tests/unit/modules/scene/localDraftStore.test.ts`
4. `backend/docs/aurora-reverse/area-trigger-construction-audit-v1-2026-08-13.md`
5. `backend/docs/aurora-reverse/area-existing-trigger-encounter-polygon-mutation-audit-v1-2026-08-24.md`
6. `frontend/src/modules/areas/application/areaObjectPolygonAuthoring.ts`
7. `frontend/src/modules/layout/components/properties/AreaObjectPolygonDialog.tsx`
8. `frontend/tests/unit/modules/layout/workspaceObjectMeshLayer.polygonGeometry.test.ts`
9. `backend/docs/aurora-reverse/area-existing-trigger-tag-audit-v1-2026-08-31.md`
10. `backend/src/modules/areas/domain/area-trigger-tag.ts`
11. `backend/test/integration/area-update-atomic-publication.spec.ts`
12. `frontend/src/modules/scene/domain/triggerTag.ts`
13. `frontend/src/modules/layout/components/properties/AreaObjectPolygonDialog.tsx`
14. `frontend/tests/regression-smoke/workspace/Workspace.trigger-tag.regression-smoke.test.tsx`
15. `backend/docs/aurora-reverse/area-existing-trigger-template-resref-audit-v1-2026-09-02.md`
16. `backend/src/modules/areas/domain/area-trigger-template-resref.ts`
17. `backend/test/unit/area-trigger-template-resref.spec.ts`
18. `backend/test/unit/area-trigger-template-resref-parser.spec.ts`
19. `frontend/src/modules/scene/domain/triggerTemplateResRef.ts`
20. `frontend/src/modules/layout/application/triggerTemplateResRefProvenance.ts`
21. `backend/docs/aurora-reverse/area-existing-trigger-localized-name-audit-v1-2026-09-02.md`
22. `backend/src/modules/areas/domain/area-trigger-localized-name.ts`
23. `backend/test/unit/area-trigger-localized-name.spec.ts`
24. `backend/test/unit/area-trigger-localized-name-parser.spec.ts`
25. `backend/test/unit/area-update-draft-projector.trigger-localized-name.spec.ts`
26. `frontend/src/modules/scene/domain/triggerLocalizedName.ts`
27. `frontend/src/modules/layout/application/triggerLocalizedNameProvenance.ts`
28. `frontend/tests/unit/modules/scene/domain/triggerLocalizedName.test.ts`
29. `frontend/tests/regression-smoke/workspace/Workspace.trigger-tag.regression-smoke.test.tsx`
30. `backend/docs/aurora-reverse/area-existing-trigger-editor-comment-audit-v1-2026-09-02.md`
31. `backend/src/modules/areas/domain/area-trigger-editor-comment.ts`
32. `backend/test/unit/area-trigger-editor-comment.spec.ts`
33. `backend/test/unit/area-trigger-editor-comment-parser.spec.ts`
34. `backend/test/unit/area-update-draft-projector.trigger-editor-comment.spec.ts`
35. `frontend/src/modules/scene/domain/triggerEditorComment.ts`
36. `frontend/src/modules/layout/application/triggerEditorCommentProvenance.ts`
37. `frontend/tests/unit/modules/scene/domain/triggerEditorComment.test.ts`
38. `frontend/tests/unit/modules/layout/workspaceSceneObjectClone.triggerEditorComment.test.ts`
39. `backend/docs/aurora-reverse/area-existing-trigger-script-resrefs-audit-v1-2026-09-02.md`
40. `backend/src/modules/areas/domain/area-trigger-script-resrefs.ts`
41. `backend/test/unit/area-trigger-script-resrefs.spec.ts`
42. `backend/test/unit/area-trigger-script-resrefs-parser.spec.ts`
43. `frontend/src/modules/scene/domain/triggerScriptResRefs.ts`
44. `frontend/src/modules/layout/application/triggerScriptResRefsProvenance.ts`
45. `frontend/tests/unit/modules/scene/domain/triggerScriptResRefs.test.ts`

---

## 11) Encounters

Status: `PARTIAL` (exact bounded Create + existing origin, polygon, Tag, Active,
PlayerOnly, Reset, ResetTime, SpawnOption, Respawns, creature-count, event-
script, catalog-bound Faction and Difficulty, inline LocalizedName, and paired-
GIC editor Comment, ordered GIT VarTable, complete structural CreatureList,
and complete structural SpawnPointList update)

Implemented now:
1. New `encounters` drafts carry the exact binary-free provenance for the
   admitted `x2_gnoll001.UTE` profile.
2. Factory and local-draft round-trip retain the exact ResRef, Tag, profile,
   digest, GFF identity, origin, and zero bearing.
3. Area Update resolves the immutable retail UTE and atomically appends exact
   paired type-`7` GIT/GIC entries with persisted readback verification.
4. The backend owns the accepted four-point local type-`1` polygon, copies the
   exact UTE fields through `CreatureList`, excludes palette/comment fields,
   and emits an empty `SpawnPointList`; client geometry and nonzero bearing
   fail closed.
5. Existing native encounter origin transforms preserve complete geometry,
   the empty spawn-point list, every unrelated GIT field, and exact GIC through
   the shared object-mutation path.
6. Retained source-provenant Encounter polygons use the same strict ordered
   native-local editor and closed Three.js guide. Area Update replaces the
   complete type-`1` `Geometry` list through family/ordinal-bound float32 CAS,
   exact readback, and atomic publication while preserving origin, the exact
   empty `SpawnPointList`, paired GIC, and unrelated resources.
7. Retained type-`7` Encounter `Tag : CExoString` is independently editable
   only from exact immutable presence-sensitive provenance. Empty and
   whitespace-bearing values remain exact under the proven 32 UTF-16-code-unit
   boundary. The shared Properties shell, workspace/history/local Save,
   projection, ordinal CAS planner, GFF writer, candidate readback, and atomic
   publication preserve every unrelated GIT member plus complete GIC and IFO.
8. Retained type-`7` Encounter `Active : BYTE` is independently editable only
   from exact immutable source storage `0|1`. The Properties checkbox exposes
   `ACTIVE_NOW` for admitted provenance and disabled `PRESERVE_ONLY` otherwise.
   Apply atomically composes polygon, Tag, and Active; workspace/history/local
   Save, ordinal CAS planning, GFF field-only write/readback, and revision-fenced
   publication preserve immutable source provenance, complete GIC, and IFO.
9. Retained type-`7` Encounter `PlayerOnly : BYTE` is independently editable
   only from exact immutable source storage `0|1`. The Properties shell maps it
   to Player Triggered Only, enables it only as `ACTIVE_NOW`, and visibly keeps
   malformed or absent storage `PRESERVE_ONLY`. Polygon, Tag, Active, and
   PlayerOnly apply atomically; strict API/workspace/history boundaries,
   member-level ordinal CAS, exact field-only writer/readback, and revision-
   fenced publication preserve every unrelated GIT member, GIC, and IFO.
10. Retained type-`7` Encounter `Reset : BYTE` is independently editable only
    from exact immutable source storage `0|1`. The Properties checkbox is
    `ACTIVE_NOW` only for admitted provenance and otherwise visibly
    `PRESERVE_ONLY`. Polygon, Tag, Active, PlayerOnly, and Reset apply
    atomically; member-level ordinal CAS changes only the existing Reset byte,
     preserves ResetTime, Respawns, every other GIT member, complete GIC and
     IFO, and requires exact candidate plus persisted readback.
11. Retained type-`7` Encounter `ResetTime : INT` is independently editable
    only from one exact immutable integer in the Toolset range `1..32000`.
    The Reset Time spinner is enabled only when both exact ResetTime provenance
    and the editable Reset target are present; toggling Reset off does not erase
    the spinner value because the native Properties save path reads ResetTime
    independently. Polygon, Tag, Active, PlayerOnly, Reset, and ResetTime apply
    atomically. Member-level ordinal CAS replaces only the existing INT and
    preserves Reset, Respawns, all unrelated GIT fields, complete GIC and IFO,
    with exact candidate and persisted readback.
12. Retained type-`7` Encounter `SpawnOption : INT` is independently editable
    only from one exact Toolset combo index `0|1`, with immutable labels
    `Continuous` and `Single Shot`. The Properties shell mirrors native gating:
    Reset and ResetTime are editable only for exact continuous provenance, and
    switching to Single Shot disables them without erasing their target values.
    Polygon, Tag, Active, PlayerOnly, Reset, ResetTime, and SpawnOption apply
    atomically. Member-level ordinal CAS replaces only the existing INT and
    preserves Reset, ResetTime, Respawns, every unrelated GIT member, complete
    GIC and IFO, with exact candidate and persisted readback.
13. Retained type-`7` Encounter `Respawns : INT` is independently editable
    only from the exact native Infinite sentinel `-1` or a finite integer in
    `0..32000`. The Properties shell presents a finite spinner plus `Infinite
    Respawn`, maps the sentinel to checked plus finite display value `0`, and
    mirrors the native Reset/SpawnOption enabled-state gates without deleting
    either the finite draft or immutable source. Polygon, Tag, Active,
    PlayerOnly, Reset, ResetTime, SpawnOption, and Respawns apply atomically.
    Member-level ordinal CAS replaces only the existing INT and preserves every
    unrelated GIT member, complete GIC and IFO, with exact candidate and
    persisted readback.
14. Retained type-`7` Encounter `MaxCreatures : INT` and `RecCreatures : INT`
    are editable only as one exact immutable pair in `1..8` with Minimum not
    exceeding Maximum. The Properties shell exposes Aurora's `Maximum
    Creatures` and `Minimum Creatures` controls. Lowering Maximum below Minimum
    lowers Minimum; raising Minimum above Maximum raises Maximum. API,
    workspace, history and local Save keep detached source provenance; pair
    CAS, field-only GFF replacement, candidate readback, and revision-fenced
    publication preserve every unrelated GIT member, complete GIC, and IFO.
15. Retained type-`7` Encounter `OnEntered`, `OnExit`, `OnExhausted`,
    `OnHeartbeat`, and `OnUserDefined` ResRefs are editable only as one exact
    complete immutable tuple. Source provenance may retain mixed case; changed
    targets must be lowercase and match `[a-z0-9_]{0,16}` per slot. The five
    Properties inputs support Apply/Cancel/reopen/OK and local Save while
    keeping source and target detached. Complete tuple CAS replaces only the
    five existing ResRef fields and exact readback plus revision-fenced
    publication preserve field order, unrelated GIT members, complete GIC,
    ARE, and IFO.
16. Retained type-`7` Encounter `Faction : DWord` is independently editable
    only from exact immutable storage bound to the current complete module
    `repute.fac` catalog. The Properties selector exposes physical catalog rows
    `1..factionCount-1`, deliberately excludes row `0`, and uses catalog labels
    only for presentation. API, scene, workspace, history, clone, and local
    Save retain detached source value, catalog digest, and catalog count.
    Target mutation is emitted only when changed; fresh catalog re-resolution,
    ordinal-bound CAS, exact field-only GFF replacement, candidate and persisted
    readback, and revision-fenced publication preserve `repute.fac`, every
    unrelated GIT field, complete GIC, ARE, and IFO.
17. Retained type-`7` Encounter `Difficulty : INT` and
    `DifficultyIndex : INT` are editable only as one catalog-coherent pair.
    The selected physical zero-based row comes from the exact effective
    ordered `encdifficulty.2da`, and `Difficulty` must equal that row's
    `VALUE` in `-20..20`. The Properties selector uses TLK-derived text only
    for display. HTTP, scene, workspace, history, clone, Apply/Cancel/reopen,
    OK, and local Save preserve detached source pair plus catalog digest/count.
    Fresh catalog re-resolution, ordinal-bound two-field CAS, candidate
    readback, and revision-fenced publication preserve the catalog, all
    unrelated GIT fields, complete GIC, ARE, and IFO.
18. Retained type-`7` Encounter `LocalizedName : CExoLocString` preserves its
    complete presence-sensitive storage and is editable only for the admitted
    inline profile: unsigned `strRef` `0xffffffff`, zero or one non-empty
    identifier-`0` entry, printable ASCII, and at most 256 bytes. TLK-backed,
    multilingual, malformed, non-ASCII, or over-budget storage is visibly
    `PRESERVE_ONLY`. The Basic-tab Name control, HTTP/scene/workspace/history
    boundaries, Apply/Cancel/reopen/OK/local Save, ordinal CAS, exact field-only
    GFF replacement, and candidate plus persisted readback preserve immutable
    source storage, field order, all unrelated GIT members, complete GIC, ARE,
    and IFO.
19. Retained same-index type-`7` paired-GIC Encounter
    `Comment : CExoString` is editable only when one exact field already
    exists. Empty, whitespace-only, multiline, and Unicode strings remain
    exact up to 4096 UTF-16 code units; NUL, missing, duplicate, wrong-type,
    wrong-family, or unpaired storage is preserve-only and is never
    synthesized. HTTP/scene/workspace/history boundaries retain immutable
    source text separately from the Comments target. Apply, Cancel, reopen,
    OK, local Save, digest-bound ordinal CAS, GIC-only write, candidate and
    persisted readback, and atomic publication preserve complete GIT, ARE,
    IFO, field order, and unrelated paired-GIC data.
20. Retained type-`7` Encounter `VarTable` is editable only from exact
    immutable ordered provenance. The shared web profile admits at most 1024
    type-`0` entries; preserves physical order, duplicate names, whitespace,
    empty strings, and exact signed INT, finite float32, or CExoString values;
    and enforces name, string, NUL, aggregate-byte, and exact-float32 budgets.
    The Properties table supports add, edit, remove, and reorder without
    mutating source provenance. HTTP/scene/workspace/history/clone boundaries,
    Apply/Cancel/reopen/OK/local Save, digest-bound ordinal CAS, generic GFF
    VarTable write, candidate plus persisted readback, and atomic publication
    preserve unrelated GIT members, complete GIC, ARE, and IFO. An empty target
    removes `VarTable`, matching the proven common Encounter writer.
21. Retained type-`7` Encounter `CreatureList` is editable as one complete
    ordered structural CAS. Source entries are retained by unique immutable
    source index and may be reordered or removed. Add and replacement accept
    only exact effective creature UTC bindings carrying template ID, source
    key, byte length, SHA-256, ResRef, Appearance, and binary32 CR guards. The
    backend resolves the winner again, derives the tuple from exact
    `UTC `/`V3.2` root bytes, and rejects source or tuple drift. The Properties
    window supports add, replace, remove, move up/down, duplicates through
    repeated blueprint selection, empty list, and per-entry `SingleSpawn`.
    Complete-list readback and atomic publication preserve unrelated GIT,
    complete GIC, ARE, and IFO.
22. Retained stationary type-`7` Encounter `SpawnPointList` is editable as one
    complete ordered structural CAS with add, float32 edit, remove, reorder,
    empty-list replacement, exact type-`2` native entry emission, candidate
    readback, and atomic companion preservation. Origin movement with populated
    spawn points remains fail-closed pending native coupling proof.

Not implemented yet:
1. Arbitrary encounter-template Create.
2. Remaining Encounter properties outside the implemented bounded families
   and runtime spawning behavior authoring/certification.
3. Fresh exact-candidate Toolset Save/Build/reopen and NWN certification.

Evidence in repo:
1. `backend/docs/aurora-reverse/area-existing-encounter-tag-audit-v1-2026-08-31.md`
2. `backend/src/modules/areas/domain/area-encounter-tag.ts`
3. `backend/test/integration/area-update-atomic-publication.spec.ts`
4. `frontend/src/modules/scene/domain/encounterTag.ts`
5. `frontend/src/modules/layout/application/encounterTagProvenance.ts`
6. `frontend/tests/regression-smoke/workspace/Workspace.encounter-tag.regression-smoke.test.tsx`
7. `frontend/src/modules/scene/domain/areaWaypointConstructionProfile.ts`
8. `frontend/tests/unit/modules/scene/sceneFactory.test.ts`
9. `frontend/tests/unit/modules/scene/localDraftStore.test.ts`
10. `backend/docs/aurora-reverse/area-encounter-construction-audit-v1-2026-08-13.md`
11. `backend/docs/aurora-reverse/area-existing-trigger-encounter-polygon-mutation-audit-v1-2026-08-24.md`
12. `frontend/src/modules/areas/application/areaObjectPolygonAuthoring.ts`
13. `frontend/src/modules/layout/components/properties/AreaObjectPolygonDialog.tsx`
14. `frontend/tests/unit/modules/layout/workspaceObjectMeshLayer.polygonGeometry.test.ts`
15. `backend/docs/aurora-reverse/area-existing-encounter-active-audit-v1-2026-08-31.md`
16. `backend/src/modules/areas/domain/area-encounter-active.ts`
17. `frontend/src/modules/scene/domain/encounterActive.ts`
18. `frontend/src/modules/layout/application/encounterActiveProvenance.ts`
19. `backend/docs/aurora-reverse/area-existing-encounter-player-only-audit-v1-2026-08-31.md`
20. `backend/src/modules/areas/domain/area-encounter-player-only.ts`
21. `frontend/src/modules/scene/domain/encounterPlayerOnly.ts`
22. `frontend/src/modules/layout/application/encounterPlayerOnlyProvenance.ts`
23. `backend/docs/aurora-reverse/area-existing-encounter-reset-audit-v1-2026-08-31.md`
24. `backend/src/modules/areas/domain/area-encounter-reset.ts`
25. `frontend/src/modules/scene/domain/encounterReset.ts`
26. `frontend/src/modules/layout/application/encounterResetProvenance.ts`
27. `backend/docs/aurora-reverse/area-existing-encounter-reset-time-audit-v1-2026-08-31.md`
28. `backend/src/modules/areas/domain/area-encounter-reset-time.ts`
29. `frontend/src/modules/scene/domain/encounterResetTime.ts`
30. `frontend/src/modules/layout/application/encounterResetTimeProvenance.ts`
31. `backend/docs/aurora-reverse/area-existing-encounter-spawn-option-audit-v1-2026-08-31.md`
32. `backend/src/modules/areas/domain/area-encounter-spawn-option.ts`
33. `frontend/src/modules/scene/domain/encounterSpawnOption.ts`
34. `frontend/src/modules/layout/application/encounterSpawnOptionProvenance.ts`
35. `backend/docs/aurora-reverse/area-existing-encounter-respawns-audit-v1-2026-08-31.md`
36. `backend/src/modules/areas/domain/area-encounter-respawns.ts`
37. `frontend/src/modules/scene/domain/encounterRespawns.ts`
38. `frontend/src/modules/layout/application/encounterRespawnsProvenance.ts`
39. `backend/docs/aurora-reverse/area-existing-encounter-creature-counts-audit-v1-2026-08-31.md`
40. `backend/src/modules/areas/domain/area-encounter-creature-counts.ts`
41. `frontend/src/modules/scene/domain/encounterCreatureCounts.ts`
42. `frontend/src/modules/layout/application/encounterCreatureCountsProvenance.ts`
43. `backend/docs/aurora-reverse/area-existing-encounter-script-resrefs-audit-v1-2026-09-01.md`
44. `backend/src/modules/areas/domain/area-encounter-script-resrefs.ts`
45. `frontend/src/modules/scene/domain/encounterScriptResRefs.ts`
46. `frontend/src/modules/layout/application/encounterScriptResRefsProvenance.ts`
47. `backend/docs/aurora-reverse/area-existing-encounter-faction-audit-v1-2026-09-01.md`
48. `backend/src/modules/areas/domain/area-encounter-faction.ts`
49. `frontend/src/modules/scene/domain/encounterFaction.ts`
50. `frontend/src/modules/layout/application/encounterFactionProvenance.ts`
51. `backend/docs/aurora-reverse/area-existing-encounter-difficulty-pair-audit-v1-2026-09-01.md`
52. `backend/src/modules/areas/domain/area-encounter-difficulty.ts`
53. `backend/src/modules/catalog/domain/effective-area-encounter-difficulty-two-da.ts`
54. `frontend/src/modules/scene/domain/encounterDifficulty.ts`
55. `frontend/src/modules/layout/application/encounterDifficultyProvenance.ts`
56. `backend/docs/aurora-reverse/area-existing-encounter-localized-name-audit-v1-2026-09-01.md`
57. `backend/src/modules/areas/domain/area-encounter-localized-name.ts`
58. `backend/test/unit/area-encounter-localized-name-parser.spec.ts`
59. `frontend/src/modules/scene/domain/encounterLocalizedName.ts`
60. `frontend/src/modules/layout/application/encounterLocalizedNameProvenance.ts`
61. `frontend/tests/unit/modules/layout/workspaceSceneObjectClone.encounterLocalizedName.test.ts`
62. `backend/docs/aurora-reverse/area-existing-encounter-editor-comment-audit-v1-2026-09-01.md`
63. `backend/src/modules/areas/domain/area-encounter-editor-comment.ts`
64. `backend/test/unit/area-encounter-editor-comment.spec.ts`
65. `frontend/src/modules/scene/domain/encounterEditorComment.ts`
66. `frontend/src/modules/layout/application/encounterEditorCommentProvenance.ts`
67. `frontend/tests/unit/modules/scene/domain/encounterEditorComment.test.ts`
68. `frontend/tests/unit/modules/layout/application/encounterEditorCommentProvenance.test.ts`
69. `backend/docs/aurora-reverse/area-existing-encounter-variable-table-audit-v1-2026-09-01.md`
70. `backend/src/modules/areas/domain/area-encounter-variable-table.ts`
71. `backend/test/unit/area-encounter-variable-table.spec.ts`
72. `frontend/src/modules/scene/domain/encounterVariableTable.ts`
73. `frontend/src/modules/layout/application/encounterVariableProvenance.ts`
74. `frontend/tests/unit/modules/layout/workspaceSceneObjectClone.encounterVariables.test.ts`
75. `backend/docs/aurora-reverse/area-existing-encounter-creature-list-structural-audit-v1-2026-09-01.md`
76. `backend/src/modules/areas/domain/area-encounter-creature-single-spawn.ts`
77. `frontend/src/modules/scene/domain/encounterCreatureSingleSpawn.ts`
78. `backend/docs/aurora-reverse/area-existing-encounter-spawn-point-list-audit-v1-2026-09-01.md`
79. `frontend/src/modules/scene/domain/encounterSpawnPointList.ts`

---

## 12) Existing Area loading-screen identity

Status: `PARTIAL` (exact retained storage authoring plus effective catalog)

Implemented now:
1. The HTTP, scene, and workspace boundaries admit optional
   `areaAdvancedFlags.loadingScreenId` only as an integer from 0 through 65535.
2. Area Properties exposes the exact retained Word in the Advanced tab and
   keeps it disabled when immutable native provenance is unavailable.
3. The application facade separates source and target and exports one changed
   `{ expectedValue, value }` CAS pair without coercion or default creation.
4. Backend candidate and persisted readback validate the exact ARE root Word;
   atomic publication preserves GIT, GIC, and IFO byte-for-byte.
5. Area detail projects a bounded, immutable, provenance-bound effective
   `loadscreens.2da` catalog with physical row identity, display provenance,
   and effective TGA descriptors from module, ordered HAK, or vanilla data.
6. Area Properties replaces the raw numeric field with a catalog selector when
   that catalog is present. It exposes row `0`, native-selectable image rows,
   and an unresolved retained current Word without confusing source row tokens
   with the stored physical ordinal. The raw exact-Word fallback remains when
   no catalog is available.

Not implemented yet:
1. Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen, and
   NWN loading-screen behavior proof.

Evidence in repo:
1. `backend/docs/aurora-reverse/area-existing-loading-screen-id-audit-v1-2026-08-24.md`
2. `frontend/src/modules/areas/domain/areaAdvancedFlags.ts`
3. `backend/docs/aurora-reverse/effective-area-loadscreens-two-da-audit-v1-2026-08-24.md`
4. `frontend/src/modules/areas/domain/effectiveAreaLoadingScreenCatalog.ts`
5. `frontend/src/modules/areas/application/areaPropertiesFacade.ts`
6. `frontend/src/modules/layout/components/properties/AreaPropertiesDialog.tsx`
7. `frontend/tests/regression-smoke/areaLoadingScreenId.regression-smoke.test.tsx`

---

## 13) Existing Area event scripts and committed-module catalog

Status: `OFFLINE_VERIFIED_CATALOG_BOUND_EXISTING_INSTANCE`; browser and native
certification remain open.

Implemented now:
1. Exact existing root `OnEnter`, `OnExit`, `OnHeartbeat`, and `OnUserDefined`
   ResRefs remain independently editable through the transactional Area Update
   path with immutable source CAS and persisted ARE/GIT/GIC/IFO readback.
2. `GET /api/v1/areas/event-script-catalog` reads one immutable committed
   module revision and exposes exact root NSS type-2009 and NCS type-2010
   descriptor presence without returning source, bytecode, storage keys, or
   host paths.
3. Catalog status is only `source_and_bytecode`, `source_only`, or
   `bytecode_only`. A pair always reports `freshness = unverified`; the product
   never calls presence compiled, current, or successful.
4. The frontend validates the complete revision-bound response through a
   dedicated port and facade. Area Properties offers only NSS-backed rows,
   preserves manual/external ResRefs, supports bounded search, and shows exact
   NCS-presence/freshness diagnostics.
5. Wrong-case, nested, extension/type-mismatched, non-canonical, or colliding
   descriptors are counted and excluded. Inspection, catalog, page, and
   serialized-response budgets fail closed rather than truncate silently.

Not implemented yet:
1. NSS source editing and an Aurora Web compiler with compiler receipts,
   diagnostics, and provable NSS-to-NCS freshness.
2. Effective runtime resolution across module, ordered HAK, override,
   campaign, and base-game layers.
3. Fresh browser selection/Save/reopen, exact-candidate Toolset
   Save/Build/reopen, and NWN event-dispatch proof.

Evidence in repo:
1. `backend/docs/aurora-reverse/area-existing-event-script-resrefs-audit-v1-2026-08-21.md`
2. `backend/docs/aurora-reverse/area-event-script-catalog-and-artifact-status-audit-v1-2026-08-24.md`
3. `backend/src/modules/areas/domain/area-event-script-catalog.ts`
4. `backend/src/modules/areas/application/area-event-script-catalog.application.service.ts`
5. `frontend/src/modules/areas/domain/areaEventScriptCatalog.ts`
6. `frontend/src/modules/areas/application/areaEventScriptCatalogFacade.ts`
7. `frontend/src/modules/layout/components/properties/AreaPropertiesDialog.tsx`

---

## 14) Existing Area multi-entry inline Name

Status: `OFFLINE_VERIFIED_BOUNDED_EXISTING_INSTANCE`; browser and native
certification remain open.

Implemented now:

1. Area detail carries immutable `simple_inline_ascii` or
   `multi_entry_inline_ascii` storage provenance for an admitted retained
   `Name : CExoLocString`.
2. The HTTP mapper and persisted workspace-draft boundary validate the profile
   token and never infer editability from display text alone.
3. Area detail additively exposes the complete admitted ordered
   `{ languageId, text }[]` list. The HTTP, scene, workspace-draft, history,
   and export boundaries validate and detach the list. Presentation labels
   come only from immutable catalog `aurora-area-name-language-catalog.v1`.
4. Area Properties edits the default identifier-`0` text and every already
   existing alternate inline printable-ASCII text. It may explicitly reorder
   or remove existing alternate entries and add/reinsert a missing verified
   English/French/German/Italian/Spanish/Polish entry with nonempty printable-
   ASCII text, but never treats empty existing text as deletion. Apply sends
   one complete expected/target ordered-list CAS.
5. Backend projection, writer, candidate validation, atomic publication, and
   persisted readback require the exact source list and source profile. The
   target identifiers must retain `0`, remain unique, and occur in the source
   set or the exact bounded add catalog; new entries require nonempty text.
   Requested order is retained exactly and the simple/multi profile is
   independently derived. GIT/GIC/IFO companions remain preserve-first.
6. Existing unknown numeric identifiers stay source-bound. Identifier `1`,
   four unresolved native grid rows, TLK, and non-ASCII layouts stay
   preserve-only.

Not implemented yet:

1. The four unresolved native language-grid rows, TLK-backed mutation, and
   non-ASCII byte/encoding authoring.
2. Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen, and
   NWN localized-display proof.

Evidence in repo:

1. `backend/docs/aurora-reverse/area-existing-basic-name-multi-entry-inline-mutation-audit-v1-2026-08-25.md`
2. `backend/docs/aurora-reverse/area-existing-basic-name-existing-entry-mutation-audit-v1-2026-08-25.md`
3. `backend/docs/aurora-reverse/area-existing-basic-name-entry-removal-audit-v1-2026-08-25.md`
4. `backend/docs/aurora-reverse/area-existing-basic-name-entry-reorder-audit-v1-2026-08-25.md`
5. `backend/docs/aurora-reverse/area-existing-basic-name-bounded-entry-add-audit-v1-2026-08-25.md`
6. `frontend/src/modules/areas/domain/areaNameLanguageCatalog.ts`
7. `frontend/src/modules/areas/domain/areaBasicIdentity.ts`
8. `frontend/src/modules/areas/application/areaPropertiesFacade.ts`
9. `frontend/src/modules/areas/application/areaWorkspaceDraft.ts`
10. `frontend/tests/unit/modules/areas/areaPropertiesFacade.test.ts`
11. `frontend/tests/regression-smoke/areaDraftCrudFlow.test.tsx`
12. `frontend/tests/regression-smoke/areas/AreaPropertiesDialog.nameEntryReorder.regression-smoke.test.tsx`
13. `frontend/tests/regression-smoke/areas/AreaPropertiesDialog.nameEntryAdd.regression-smoke.test.tsx`

---

## 15) Existing Area visual-environment core

Status: `OFFLINE_VERIFIED_BOUNDED_EXISTING_INSTANCE`; browser and native
certification remain open.

Implemented now:

1. Area detail and the scene carry one exact complete day/night, weather,
   shadow-opacity, and sun/moon color/fog/shadow tuple only when all 16 native
   ARE fields have admitted provenance.
2. The HTTP boundary and persisted workspace draft reject partial, extended,
   out-of-range, and unknown-mode values. The application facade builds one
   full-tuple compare-and-swap mutation from immutable source provenance.
3. The Aurora-shaped Visual tab edits the three proven day/night modes,
   percent fields, packed RGB colors, `0..15` fog amounts, and shadow booleans.
4. Apply updates `areaVisualEnvironment` and the corresponding 16 renderer
   `lighting.fields` incrementally. Unrelated lighting fields remain retained;
   no full Area reload is authorized.
5. Direct Verify/Export and transactional Area Update retain the nested CAS.
   Backend candidate and persisted readback compare the exact target, while a
   visual-only publication keeps GIT, GIC, and module IFO byte-identical.
6. The additive exact pair `visualEnvironmentScalarControls` admits integer
   `FogClipDist` values `30..9999` and `WindPower` values `0..2`. The Visual
   tab, renderer, direct transfer, transactional writer, and independent
   readback carry one full source-bound CAS pair.
7. Effective `environment.2da` and `skyboxes.2da` catalogs expose immutable
   physical-row identities and source hashes. The Visual tab edits admitted
   `LightingScheme` and `SkyBox` rows only when the complete catalog, retained
   selection, visual tuple, and scalar tuple are available.
8. Selecting a Lighting Scheme applies its complete native visual/scalar row,
   then admits complete manual overrides and an explicit final Sky Box. A
   Sky-Box-only edit changes no visual or scalar state.
9. Verify/Export sends one hash-bound catalog selection CAS. A Lighting Scheme
   change suppresses the separate visual/scalar CAS members, while Sky-Box-only
   selection may coexist with those disjoint mutations.
10. The backend freshly resolves both catalogs, validates the retained state,
    writes exact native fields, reparses candidate ARE bytes independently,
    verifies persisted readback, and preserves unrelated ARE plus GIT/GIC/IFO.

Not implemented yet:

1. Fresh browser incremental-render and Save/reopen proof.
2. Exact-candidate Toolset Save/Build/reopen and NWN day/night, weather, fog,
   color, and shadow behavior proof.

Evidence in repo:

1. `backend/docs/aurora-reverse/area-existing-visual-environment-core-mutation-audit-v1-2026-08-25.md`
2. `backend/docs/aurora-reverse/area-existing-visual-environment-scalar-controls-mutation-audit-v1-2026-08-25.md`
3. `backend/src/modules/areas/domain/area-visual-environment.ts`
4. `backend/src/modules/areas/domain/area-visual-environment-scalar-controls.ts`
5. `frontend/src/modules/areas/domain/areaVisualEnvironment.ts`
6. `frontend/src/modules/areas/domain/areaVisualEnvironmentScalarControls.ts`
7. `frontend/src/modules/areas/application/areaPropertiesFacade.ts`
8. `frontend/tests/unit/modules/areas/areaVisualEnvironmentFrontendFlow.test.ts`
9. `frontend/tests/regression-smoke/areaVisualEnvironment.regression-smoke.test.ts`
10. `backend/docs/aurora-reverse/area-existing-visual-environment-catalog-selection-mutation-audit-v1-2026-08-25.md`
11. `backend/src/modules/areas/domain/area-visual-environment-catalog-selection-mutation.ts`
12. `frontend/src/modules/areas/domain/areaVisualEnvironmentCatalogSelectionMutation.ts`
13. `frontend/tests/regression-smoke/areas/AreaPropertiesDialog.visualCatalogSelection.regression-smoke.test.tsx`

---

## Runtime cache restart continuity

Status: `WEB_RUNTIME_VERIFIED`

One unchanged Chrome document opened exact Area `_winds_study`, remained alive
through a real host-local backend process replacement, adopted a new validated
session through storage synchronization without navigation, and reopened the
same Area. The guarded CDP active window recorded two authoritative Placeable
batch responses, two Placeable single responses, nine Placeable asset
deliveries, and one tile batch, all HTTP 200 with zero failed or in-flight
requests. Placeables settled 4/4 ready with zero fallback and tiles settled
4/4 loaded with zero pending, failed, or bridge tiles.

Evidence:
`backend/docs/aurora-reverse/evidence/area-stale-cache-same-browser-restart-2026-08-19/runtime-verification-summary.json`.

This verifies Aurora Web restart resilience only; it is not Toolset or NWN
runtime parity evidence.

---

## Aurora First Backlog (Execution Split)

### Track A: code now (no retail blocker)
1. `AF-NOW-01` Enforce static-placeable move policy in generic gizmo/keyboard paths. (`Done`)
2. `AF-NOW-02` Expand placeable properties payload (preserve-only flags + script slots schema). (`Done`)
3. `AF-NOW-03` Add sound positioning domain + dialog shell with strict mode gating. (`Done` for shell + mode gating baseline)
4. `AF-NOW-04` Add tileset/groups domain scaffolding with deterministic validators. (`Done` for scaffolding + validators)
5. `AF-NOW-05` Add door transition preserve-only schema and shell UI. (`Done` for preserve-only schema + read-only shell)
6. `AF-NOW-06` Add focused regression suite for adjust-location multi-selection and history semantics. (`Done`)
7. `AF-NOW-07` Prove same-browser Placeable cache recovery across a real host-local backend restart. (`Done`)

### Track B: retail-hard-confirm later
1. `AF-RHC-01` Confirm orientation/bearing dial math and snapping rules.
2. `AF-RHC-02` Confirm canonical ARE/GIT key mapping for visual transforms and door transitions.
3. `AF-RHC-03` Confirm sound runtime behavior edge-cases (mode semantics, attenuation, scheduling).
4. `AF-RHC-04` Confirm VFX runtime semantics (blend/sort/collision/limits).
5. `AF-RHC-05` Confirm tileset master-cell and neighborhood precedence rules.
6. `AF-RHC-06` Confirm world-origin and axis-sign parity across area/module pipelines.

## Decision policy
1. `Track A` can be implemented immediately with preserve-only strategy where needed.
2. `Track B` items must not be guessed into canonical semantics before hard confirmation.
