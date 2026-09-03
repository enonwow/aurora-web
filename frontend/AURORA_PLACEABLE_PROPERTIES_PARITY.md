# Aurora Placeable Properties Parity Notes

Date: 2026-08-19
Status: Existing-instance native property lanes include tested TrapType, BodyBag/Treasure Model, exact TemplateResRef, canonical PortraitId, module-bound Faction, and complete native type-1/2/3 Variable-table implementations; effective-catalog UTP Placeable Create is offline implemented; complete multilingual localized text, optional mutation analysis, and native runtime certification remain open

## Purpose

This note records the exact current mapping between the web `Placeable Object
Properties` dialog and an existing type-`9` Aurora Area GIT Placeable. It is a
release-safety inventory, not a claim that every visible control is already
native-persistent.

The scope is ordinary `placeables`. Doors, creatures, stores, sounds, items,
triggers, encounters, waypoints, and VFX-specific editors have separate
contracts.

## Status vocabulary

- `OFFLINE_VERIFIED`: source-closed native storage, exact provenance guards,
  backend/frontend implementation, builds, focused tests, and mutation score
  100%. Fresh Toolset/NWN certification is still pending.
- `OFFLINE_IMPLEMENTED`: source-closed native storage, exact provenance guards,
  backend/frontend implementation, production builds, focused tests, and full
  regression are green; mutation analysis and fresh Toolset/NWN certification
  are still pending.
- `LOCAL_ONLY_NOT_RELEASE_ADMITTED`: the dialog can currently change local
  scene state, but Area Update does not admit the corresponding native change.
  The control cannot be represented as complete release parity.
- `PRESERVE_ONLY`: the source value is retained when available, but the dialog
  must not author or materialize it.
- `READ_ONLY_PROVENANCE`: the complete native storage shape crosses the
  boundary losslessly into immutable source metadata, but no editable target or
  writer mutation is admitted.

## Current control matrix

| Tab | Control/native field | Current status | Exact boundary |
| --- | --- | --- | --- |
| Basic | Name / `LocName` | `OFFLINE_VERIFIED` | Editable only for one present inline/custom (`strRef=0xffffffff`) empty-or-single language-0 printable-ASCII value, maximum 256 bytes. Every other exact retained storage shape remains preserve-only. |
| Basic | Tag / `Tag` | `OFFLINE_VERIFIED` | Present canonical CExoString only; immutable `(sourceKind, sourceIndex)` locator; exact `0..32` code units; no NUL, trim, normalization, folding, or truncation. |
| Basic | Appearance Type / `Appearance` | `OFFLINE_VERIFIED` | Canonical present `DWord`; digest-bound effective `placeables.2da`; target is one existing zero-based physical row; exact writer/readback preserves every other GIT field and every GIC byte. |
| Basic | Static / `Static` | `OFFLINE_VERIFIED` | Exact present `Byte` `0/1`; independent of Useable. |
| Basic | Useable / `Useable` | `OFFLINE_VERIFIED` | Exact present `Byte` `0/1`; independent of Static. |
| Basic | Plot / `Plot` | `OFFLINE_VERIFIED` | Exact present `Byte` `0/1`. |
| Basic | Has Inventory / `HasInventory` | `OFFLINE_VERIFIED` | Exact present `Byte` `0/1`; never creates or removes ItemList entries. |
| Basic | Hardness / `Hardness` | `OFFLINE_VERIFIED` | Presence-sensitive native `Byte` in `0..255`. |
| Basic | Fortitude Save / `Fort` | `OFFLINE_VERIFIED` | Presence-sensitive native `Byte` in `0..255`. |
| Basic | Reflex Save / `Ref` | `OFFLINE_VERIFIED` | Presence-sensitive native `Byte` in `0..255`. |
| Basic | Will Save / `Will` | `OFFLINE_VERIFIED` | Presence-sensitive native `Byte` in `0..255`. |
| Basic | Hit Points / `HP` plus `CurrentHP` | `OFFLINE_VERIFIED` | One complete canonical Short pair; visible HP is `1..10000`; CurrentHP is derived with Aurora's recovered signed-division, signed-Short narrowing, and minimum-one algorithm. |
| Basic | Inventory / mode-2 `ItemList` | `OFFLINE_VERIFIED` | Ordered retained whole-UTI clones; Word coordinates; remove/reorder; new entries only from exact immutable `nw_cloth022`; maximum 1,024 entries. |
| Lock | Locked, Lockable, AutoRemoveKey, KeyRequired | `OFFLINE_VERIFIED` | Four independent present native `Byte` flags. |
| Lock | Open Lock DC / `OpenLockDC` | `OFFLINE_VERIFIED` | Present native `Byte` in `0..255`. |
| Lock | Close Lock DC / `CloseLockDC` | `OFFLINE_VERIFIED` | Present native `Byte` in `0..255`. |
| Lock | Key Tag / `KeyName` | `OFFLINE_VERIFIED` | Exact CExoString, empty distinct from absent, maximum 32 product/UI characters, no normalization. |
| Trap | Is Trapped, Detectable, Disarmable, One Shot | `OFFLINE_VERIFIED` | Independent native `Byte` values restricted to `0/1`. |
| Trap | Detection DC / `TrapDetectDC` | `OFFLINE_VERIFIED` | Independent present native `Byte` in `0..255`. |
| Trap | Disarm DC / `DisarmDC` | `OFFLINE_VERIFIED` | Independent present native `Byte` in `0..255`. |
| Trap | OnDisarm and OnTrapTriggered | `OFFLINE_VERIFIED` | Exact present ResRefs, empty distinct from absent. |
| Trap | Trap Type / `TrapType`; Set DC and rogue modifiers | `OFFLINE_VERIFIED` | Canonical present `Byte`; digest-bound effective `traps.2da`; target is one existing physical row in `0..255`. `SetDC`, `DetectDCMod`, and `DisarmDCMod` are read-only projections of the selected row, never GIT mutation targets. |
| Scripts | OnUsed | `OFFLINE_VERIFIED` | Exact present ResRef, empty distinct from absent. |
| Scripts | OnClick, OnClosed, OnDamaged, OnDeath, OnHeartbeat, OnInvDisturbed, OnLock, OnMeleeAttacked, OnOpen, OnSpellCastAt, OnUnlock, OnUserDefined | `OFFLINE_VERIFIED` | Each slot is independently presence-sensitive and mutation-ordered by the frozen mapping. |
| Advanced | Conversation / `Conversation` | `OFFLINE_VERIFIED` | Exact ResRef, including explicit empty value. |
| Advanced | No Interrupt / inverse `Interruptable` | `OFFLINE_VERIFIED` | `Interruptable = noInterrupt ? 0 : 1`. |
| Advanced | Initial State / `AnimationState` | `OFFLINE_VERIFIED` | Exact `0/1/2` mapping to `Closed`, `Opened 1`, `Opened 2`. |
| Advanced | Treasure Model / `BodyBag` | `OFFLINE_IMPLEMENTED` | Canonical present `Byte`; digest-bound effective `bodybag.2da`; numeric target is one existing physical row in `0..255`. The former guessed string options are non-authoritative and cannot project a mutation. |
| Advanced | Blueprint ResRef / `TemplateResRef` | `OFFLINE_IMPLEMENTED` | Exactly one present native ResRef in the lowercase `[a-z0-9_]{1,16}` product profile; edits only the retained instance field and never changes renderer/catalog `SceneObject.resRef`. |
| Advanced | Portrait / `PortraitId` | `OFFLINE_IMPLEMENTED` | Exactly one canonical present native `Word`; digest-bound strongest module/ordered-HAK/vanilla `portraits.2da`; target is one selectable sparse physical row and its `BaseResRef` is derived display data only. Legacy `Portrait : ResRef` is never authored. |
| Advanced | Faction / `Faction` | `OFFLINE_IMPLEMENTED` | Canonical present native `DWord`; target is one zero-based physical row in exact module `repute.fac`; the digest/count-bound selector derives the display name and never treats a name as native identity. |
| Advanced | Variables / `VarTable` | `OFFLINE_IMPLEMENTED` | Ordered native list of exact struct-type-0 entries: `Name : CExoString`, `Type : DWord`, and typed `Value` (`1`: Int, `2`: Float, `3`: CExoString). Add/edit/remove/reorder preserve duplicates and exact order; empty target removes the list. The web safety profile is 1,024 entries, 64 code units per name, 4,096 per string value, and 1 MiB total text; malformed or unsupported native storage remains preserve-only. |
| Description | Localized gameplay Description | `OFFLINE_VERIFIED` | Independently editable under the same inline language-0 printable-ASCII profile, maximum 4,096 bytes. TLK-backed, multilingual, non-ASCII, absent, and malformed storage remains preserve-only. |
| Comments | paired-GIC `Comment` | `OFFLINE_VERIFIED` | Exact ordinal-paired CExoString; `0..4096` ECMAScript code units; no NUL, trim, Unicode normalization, case folding, or truncation. |

## New Placeable construction lane

| Operation | Current status | Exact boundary |
| --- | --- | --- |
| Create from effective catalog UTP | `OFFLINE_IMPLEMENTED` | Only an actual effective, repository-owned `UTP `/`V3.2` root `0xffffffff` carrying exact object key, byte SHA-256, native TemplateResRef and Tag. Catalog `templateId` remains distinct from native `templateResRef`. Compilation re-resolves the same winner; only placement is client-authored. Canonical PortraitId is copied, legacy Portrait is converted through one unique physical effective `portraits.2da` row, UTP Comment becomes paired GIC Comment, supported VarTable is retained, and non-empty ItemList fails closed. Synthetic `placeables.2da` rows are preview-only. |

## Native persistence contract

Every `OFFLINE_VERIFIED` control is admitted only for an existing
`source.type = aurora_git`, `sourceKind = placeable` object carrying exact,
present field provenance. Empty strings and explicit zero/false values remain
distinct from absence. Apply materializes only valid proven changes and
restores every invalid, absent, wrong-family, or unsupported value from the
current object.

Backend projection emits complete changed pairs only. Planning re-resolves the
immutable source ordinal and exact native value. The pair writer rejects
unknown keys, incomplete, duplicate, reordered, stale, unchanged, wrong-type,
out-of-range, cross-family, deletion-colliding, and readback-drifting
mutations. Ordinary GIT-only property changes preserve GIC byte-for-byte.
Editor Comments instead require `sourceGicSha256`, preserve every GIT byte,
and change only one exact ordinal-paired GIC `Comment` CExoString.

## UI and history contract

Apply, OK, Cancel, clone, snapshot, undo, and redo preserve immutable source
provenance. Each independently proven field has an independent admission
guard; for example `HasInventory` does not gate ItemList, `TrapFlag` does not
gate Detection DC, and Conversation does not gate Interruptable or
AnimationState.

Disabled controls are marked `PRESERVE_ONLY`. They cannot appear interactive
while their Apply path silently discards changes. Unsupported Name/Description
profiles and unadmitted TemplateResRef profiles follow this rule. Admitted Name and Description
have independent ordinal-bound guards, Tag has its own guard, and Appearance is a separate digest-bound
physical-row selector; no Basic control aliases it to `resRef`.

## Proof boundary and next work

The completed lanes have offline evidence under
`backend/docs/aurora-reverse/evidence/` and dedicated backend/frontend
mutation reports with zero survived or uncovered active mutants. This does not
replace fresh exact-candidate Toolset Save/Build/reopen, packed readback, or
NWN proof.

The 2026-08-19 regression checkpoint is green on the shared tree:

- frontend unit: `2751/2751` tests;
- frontend regression smoke: `78/78` tests;
- backend unit: `230/230` suites and `3897/3897` tests;
- backend E2E: `10/10` suites and `113/113` tests;
- frontend and backend production builds: passed.

The later BodyBag checkpoint adds 11 focused backend suites at 1,711/1,711,
7 focused frontend files at 164/164, and a complete frontend unit result of
260 files and 2,766/2,766 tests; both builds pass. Its mutation gate was not
run because current project rules require explicit user opt-in. A local
browser pass proved the stale-backend fail-closed state and viewport fit, but
the environment blocked replacing that already-running backend process, so a
fresh admitted selector capture and native Toolset/NWN recertification remain
open.

The later TemplateResRef checkpoint adds six focused backend suites at
`1485/1485`, six focused frontend files at `159/159`, a complete frontend unit
result of `263` files and `2791/2791` tests, and regression smoke at `78/78`;
both production builds pass. Its mutation gate was not run because current
project rules require explicit user opt-in. Fresh exact-candidate
Toolset/packed/NWN recertification remains open.

The later PortraitId checkpoint adds nine focused backend suites at
`1551/1551`, seven focused frontend files at `180/180`, a complete frontend
unit result of `266` files and `2808/2808` tests, and regression smoke at
`78/78`; both production builds pass. The exact sparse `portraits.2da`
catalog, canonical native Word, digest/count revalidation, derived BaseResRef,
clone/cancel/undo state, and fail-closed writer/readback are covered. Mutation
analysis was not run because it requires explicit user opt-in. Fresh
exact-candidate Toolset/packed/NWN recertification remains open.

The later Faction checkpoint adds the strict `repute.fac` parser, physical-row
catalog and digest/count provenance, exact native `Faction : DWord`
read/project/plan/write/readback, compiler catalog revalidation, immutable
frontend binding, numeric selector, Apply/clone/undo preservation, and
fail-closed handling when the catalog is absent or stale. Focused backend gates
passed at `1548/1548` plus repository/service `49/49`; focused frontend gates
passed at `148/148` plus HTTP `35/35`. The backend production build passed. The
Faction frontend itself type-checks. The previously unrelated dirty-tree
`ArrayBufferView` build blocker in `workspaceThreeRuntime.ts` is now narrowed
away safely and the repository-wide frontend build passes. A live browser pass against the already-running
stale backend correctly retained `PRESERVE_ONLY`; that process had not adopted
the new `dist`, so this is not an admitted selector or native certification.

The 2026-08-26 closure adds strict saved-workspace catalog/source/target
validation, a hash-bound golden-corpus test for the retained five-faction
Toolset-produced `repute.fac`, an atomic publication integration that proves
GIC/FAC/IFO byte identity, and a complete Apply/OK/Cancel/reopen/local-Save
regression. The current focused gates are `1821/1821` backend unit assertions,
`33/33` Area Update integration assertions, and `385/385` frontend assertions;
both production builds pass. This supersedes the older focused counts but does
not convert the stale live browser observation into proof.

The 2026-08-26 PortraitId closure adds strict saved-workspace validation for
the full sparse catalog/source/target relation and corrects the obsolete
4,096-row assumption to the unsigned-Word ceiling of 65,536. Immutable retail
evidence proves that vanilla `portraits.2da` has 16,001 physical rows, so the
old bound rejected valid data. A new atomic publication integration changes
only canonical `PortraitId : Word`, verifies complete readback, and preserves
paired GIC and IFO bytes. A dedicated regression proves the exact sparse row
and derived BaseResRef through Apply/OK, a separate Cancel, another OK, reopen,
and local Save while source provenance remains unchanged. The focused gates
are `1829/1829` backend unit assertions, `34/34` Area Update integration
assertions, and `396/396` frontend assertions; both production builds pass.
Fresh browser, packed candidate, Toolset, portrait-visual, and NWN evidence
remain separate and open.

The 2026-08-26 TemplateResRef closure adds strict saved-workspace validation
for the retained Placeable family/ordinal and the exact immutable-source plus
editable-target pair. The new transaction integration changes only the native
`TemplateResRef : ResRef`, performs complete readback, and preserves paired GIC
and IFO bytes without resolving a UTP. The dedicated regression proves
Apply/OK, a separate Cancel, another OK, reopen, and local Save while
`SceneObject.resRef` remains renderer identity and immutable source provenance
stays unchanged. The focused gates are `1822/1822` backend unit assertions,
`35/35` Area Update integration assertions, and `414/414` frontend assertions;
both production builds pass. Mutation testing remains optional and was not
run. Fresh browser, packed candidate, Toolset, and NWN evidence remain open.

The 2026-08-26 BodyBag closure adds strict saved-workspace validation for one
exact dense effective `bodybag.2da`, immutable Byte provenance, and the numeric
`treasureModelRow` target. Malformed or missing catalogs, stale digest/count,
wrong family/ordinal, absent or unknown targets, and unproven retained targets
fail closed. The new transaction integration changes only
`BodyBag : Byte`, performs complete readback, and preserves paired GIC and IFO
bytes. The regression proves physical-row identity through Apply/OK, a
separate Cancel, another OK, reopen, and local Save. The current focused gates
are `1833/1833` backend unit assertions, `36/36` Area Update integration
assertions, and `411/411` frontend assertions; both production builds pass.
The previously captured stale-backend disabled control remains diagnostic
context and is not upgraded to browser proof. Fresh browser, packed candidate,
Toolset, remains-model visual, and NWN evidence remain open.

The 2026-08-26 TrapType closure adds strict saved-workspace validation for one
exact dense effective `traps.2da`, immutable Byte provenance, numeric
`trapTypeRow`, and the three row-derived display values. Missing or malformed
catalogs, stale digest/count, wrong family/ordinal, absent or unknown targets,
unproven retained targets, and derived-column drift fail closed. The new
transaction integration changes only `TrapType : Byte`, performs complete
readback, and preserves paired GIC and IFO bytes. The regression proves the
physical row plus `SetDC`, `DetectDCMod`, and `DisarmDCMod` through Apply/OK, a
separate Cancel, another OK, reopen, and local Save. The current focused gates
are `1849/1849` backend unit assertions, `37/37` Area Update integration
assertions, and `422/422` frontend assertions; both production builds pass.
Fresh browser, packed candidate, Toolset, and NWN evidence remain open.

The 2026-08-26 AnimationState closure adds strict saved-workspace validation
for the exact immutable Byte plus independently edited `Closed`, `Opened 1`,
or `Opened 2` token. Wrong family, missing ordinal, malformed source, absent or
invalid target, and an unproven retained target fail closed. The transaction
integration changes only `AnimationState : Byte`, performs complete readback,
and preserves paired GIC and IFO bytes. The regression proves the frozen
three-option selector through Apply/OK, a separate Cancel, another OK, reopen,
and local Save. The current focused gates are `1801/1801` backend unit
assertions, `38/38` Area Update integration assertions, and `430/430` frontend
assertions; both production builds pass. Fresh browser, packed candidate,
Toolset, animation-visual, and NWN evidence remain open.

The 2026-08-26 Conversation/Interruptable closure adds strict independently
presence-sensitive saved-workspace validation for the exact ResRef and Byte.
An empty Conversation remains a valid value, and `noInterrupt` is only the
documented inverse view of `Interruptable`. Partial pairs, malformed values,
wrong family/ordinal, and unproven retained targets fail closed. The
transaction integration changes only the two native fields, performs complete
readback, and preserves paired GIC and IFO bytes. The regression proves Apply
plus OK, a separate Cancel, another OK, reopen, and local Save. The current
focused gates are `1816/1816` backend unit assertions, `39/39` Area Update
integration assertions, and `453/453` frontend assertions; both production
builds pass. Fresh browser, packed candidate, Toolset, and NWN behavior remain
open.

The 2026-08-26 Static/Useable closure adds strict independently
presence-sensitive saved-workspace validation for the two exact native Bytes.
Presentation-only defaults remain loadable when neither source field is
proven, but cannot be promoted into an authored mutation. Partial pairs,
malformed values, wrong family/ordinal, and unproven retained targets fail
closed. The transaction integration changes only `Static` and `Useable`,
performs complete readback, and preserves paired GIC and IFO bytes. The
regression proves Apply plus OK, a separate Cancel, another OK, reopen, and
local Save. The current focused gates are `1801/1801` backend unit assertions,
`40/40` Area Update integration assertions, and `451/451` frontend assertions;
both production builds pass. Fresh browser, packed candidate, Toolset, and NWN
behavior remain open.

The 2026-08-26 Plot/HasInventory closure adds the same independently
presence-sensitive saved-workspace boundary for the two exact native Bytes.
Presentation-only defaults remain loadable without provenance but cannot be
authored. Partial pairs, malformed values, wrong family/ordinal, and unproven
retained targets fail closed. The transaction integration changes only `Plot`
and `HasInventory`, performs complete readback, preserves paired GIC/IFO bytes,
and does not materialize or rewrite `ItemList`. The regression proves Apply
plus OK, a separate Cancel, another OK, reopen, and local Save. The current
focused gates are `1801/1801` backend unit assertions, `41/41` Area Update
integration assertions, and `461/461` frontend assertions; both production
builds pass. Fresh browser, packed candidate, and Toolset Save/Build/reopen
remain open; no NWN behavior claim is made for these storage flags.

The 2026-08-26 durability/save Byte closure adds strict partial-map
saved-workspace validation for `Hardness`, `Fort`, `Ref`, and `Will`. Every
proven source and matching target must be an exact integer in `0..255`;
unsupported keys, malformed maps, missing targets, and the wrong family or
ordinal fail closed. Presentation-only values remain loadable without source
provenance but cannot be authored. The transaction integration changes the
four fields in their frozen native order, performs complete readback, and
preserves paired GIC and IFO bytes. The regression proves Apply plus OK, a
separate Cancel, another OK, reopen, and local Save. The current focused gates
are `1801/1801` backend unit assertions, `42/42` Area Update integration
assertions, and `477/477` frontend assertions; both production builds pass.
Fresh browser, packed candidate, Toolset, and NWN evidence remain open.

The 2026-08-26 HP/CurrentHP closure adds strict saved-workspace validation for
the exact two-Short source pair and the single editable HP target. Source and
target HP must be integers in `1..10000`; CurrentHP must be a signed native
Short and remains immutable provenance. Missing or extra source members,
malformed ranges, wrong family/ordinal, and a missing target fail closed. The
transaction integration changes `HP=15, CurrentHP=45` to `HP=30,
CurrentHP=90`, performs complete readback, and preserves paired GIC and IFO
bytes. The regression proves Apply plus OK, a separate Cancel, another OK,
reopen, and local Save. The current focused gates are `1801/1801` backend unit
assertions, `43/43` Area Update integration assertions, and `507/507` frontend
assertions; both production builds pass. Fresh browser, packed candidate,
Toolset, and NWN evidence remain open.

The 2026-08-27 editor Comment closure adds strict saved-workspace validation
for the exact ordinal-paired GIC `Comment : CExoString`. Empty source text is
valid and distinct from absent provenance. Source and target preserve exact
`0..4096` ECMAScript code units without NUL, trimming, normalization, or
truncation; presentation-only comments remain loadable but cannot become
authoritative. The transaction integration changes only the paired GIC
Comment, performs complete readback, and preserves GIT and IFO bytes. The
regression proves multiline and decomposed-Unicode text through Apply plus OK,
a separate Cancel, another OK, reopen, and local Save while immutable empty
source provenance remains unchanged. The current focused gates are
`1801/1801` backend unit assertions, `44/44` Area Update integration
assertions, and `497/497` frontend assertions; both production builds pass.
Fresh browser and exact-candidate Toolset Save/Build/reopen evidence remain
open. This editor-only value has no NWN behavior claim.

The later Variables checkpoint closes the Aurora-first `VarTable` audit and
implements the full native type set `1..3` for existing Placeables. The backend
now parses exact ordered provenance, projects a complete changed pair, reparses
and rejects stale or malformed storage, and replaces or removes only the exact
native list with full typed readback while preserving every unrelated GIT field
and every GIC byte. The frontend maps immutable provenance, exposes admitted
add/edit/remove/reorder controls, preserves duplicates and order, applies strict
budgets and float32 materialization, and retains clone/cancel/undo state. Focused
backend gates passed at `1504/1504`, focused frontend gates at `198/198`, the
complete backend unit gate at `4089/4089`, and the complete frontend unit gate
at `2847/2847`. Backend build and the Vite production bundle pass. The ordinary
frontend `tsc` gate now passes after safely excluding non-indexable `DataView`
texture payloads. Regression smoke passed
`77/78`; the single timing-sensitive auth failure passed immediately in an
isolated rerun. Mutation analysis was not run because it requires explicit user
opt-in. A fresh admitted browser capture and exact-candidate Toolset/packed/NWN
recertification remain open.

The formerly stale Runtime Settings texture-index tests now use explicit
global-logout confirmation and the asynchronous generation-publication flow;
the complete backend E2E gate is green. The localized-string focused suites
(backend 1,444; frontend 136), full unit suites, builds, and dedicated mutation
gates (backend 275/275; frontend 266/266) are green at 100%. The Area
render-payload recovery workers also stop cleanly on unmount; viewport wiring
is 93/93 and smoke has no teardown errors.

Next work, in order:

1. `COMPLETED_BOUNDED 2026-08-19`: exact inline language-0 printable-ASCII
   mutation, writer/readback, and UI admission for Name and Description.
2. Keep full multilingual/TLK-backed localized-string editing preserve-only
   until its complete editor semantics and native certification are closed.
3. `COMPLETED 2026-08-19`: repair the outdated copy-on-open, provenance, and
   renderer fixtures and pass the full frontend unit and regression-smoke
   gates. Signed native object Z is now preserved rather than clamped to zero.
4. `SAME_BROWSER_RESTART_RUNTIME_VERIFIED`:
   cached renderer contracts are revalidated before publication and one later
   cache miss recovers without republishing the stale URL. One unchanged Chrome
   document survived a real host-local backend process replacement, adopted a
   new validated session without navigation, reopened exact `_winds_study`,
   received two authoritative Placeable batches and all active asset requests
   as HTTP 200, then settled Placeables 4/4 and tiles 4/4 with zero fallback,
   pending, failed, or bridge state. Exact evidence is frozen under
   `backend/docs/aurora-reverse/evidence/area-stale-cache-same-browser-restart-2026-08-19/`.
5. `PACKED_CANDIDATE_READY / NWN_PROOF_OPEN`: the PathConnect differential
   module, positive and negative Areas, compiled runtime binding, and AUR-S07
   profile are packed and hash-bound. Complete the user-owned Test Module run
   and the positive-crossing/negative-non-crossing NWN certification.
6. `OFFLINE_IMPLEMENTED 2026-08-19`: exact `BodyBag : Byte` and effective
   `bodybag.2da` physical-row editing. Restart the backend, recapture the
   admitted browser selector, then complete mutation analysis only with
   explicit opt-in and run exact-candidate Toolset/NWN recertification.
7. `OFFLINE_IMPLEMENTED 2026-08-19`: exact `TemplateResRef : ResRef` retained
   instance editing, separated from renderer/catalog identity. Recapture one
   admitted browser input after backend restart, then complete optional
   mutation analysis only with explicit opt-in and native recertification.
8. `OFFLINE_IMPLEMENTED 2026-08-19`: canonical `PortraitId : Word` editing
   through one exact sparse effective `portraits.2da` catalog. Recapture one
   admitted browser selector after backend restart, then complete optional
   mutation analysis only with explicit opt-in and native recertification.
9. `OFFLINE_IMPLEMENTED 2026-08-19`: canonical `Faction : DWord` editing
   through exact module `repute.fac` physical ordinals. Restart the backend,
   recapture one admitted browser selector, then complete optional mutation
   analysis only with explicit opt-in and native recertification.
10. `OFFLINE_IMPLEMENTED 2026-08-19`: Aurora-first `VarTable` audit plus exact
    ordered Int/Float/String CRUD, provenance, projection, stale planning,
    writer/readback, UI admission, and history preservation. Recapture one
    admitted browser editor after backend restart, then complete optional
    mutation analysis only with explicit opt-in and native recertification.
11. `OFFLINE_IMPLEMENTED 2026-08-19`: replace the one-template Placeable Create
    limitation with exact effective-catalog UTP construction. Focused backend
    coverage is `1276/1276`, focused frontend construction/draft coverage is
    `46/46`, renderer type-safety follow-up is `25/25`, complete units are
    backend `4110/4110` and frontend `2876/2876`, regression smoke is `78/78`,
    backend E2E is `113/113`, and both production builds passed at the offline
    checkpoint. The later resource-safe runtime checkpoint synchronized 1,497
    UTP plus six 2DA files without bulk MDL/PWK, rendered exact Water Trough as
    a generic model with five textures, and captured `_winds_study` with tiles
    4/4, Placeables 4/4, zero failed/pending/bridge/fallback, and 19/19 asset
    deliveries HTTP 200. Atomic immutable-snapshot publication and independent
    persisted paired GIT/GIC readback pass in the `21/21` Area Update
    integration suite. Complete packed MOD/HAK readback, Toolset
    Save/Build/reopen, NWN, and HAK/module-precedence certification next. The
    current frontend production build passes with only the existing large-chunk
    advisory.
12. `OFFLINE_VERIFIED 2026-08-26`: exact `TrapType : Byte` editing through one
    digest-bound effective `traps.2da` physical row, with read-only derived
    `SetDC`, `DetectDCMod`, and `DisarmDCMod`. Complete fresh browser readback
    and exact-candidate Toolset/NWN recertification without upgrading offline
    assertions into live proof.
13. `OFFLINE_VERIFIED 2026-08-26`: exact `AnimationState : Byte` editing with
    the frozen `Closed`/`Opened 1`/`Opened 2` mapping. Complete fresh browser
    readback and exact-candidate Toolset/NWN animation recertification.
14. `OFFLINE_VERIFIED 2026-08-26`: independently presence-sensitive
    `Conversation : ResRef` and `Interruptable : Byte`, including empty ResRef
    and inverse `noInterrupt`. Complete fresh browser readback and
    exact-candidate Toolset/NWN behavior recertification.
15. `OFFLINE_VERIFIED 2026-08-26`: independently presence-sensitive
    `Static : Byte` and `Useable : Byte`, while presentation-only defaults stay
    non-authoritative. Complete fresh browser readback and exact-candidate
    Toolset/NWN behavior recertification.
16. `OFFLINE_VERIFIED 2026-08-26`: independently presence-sensitive
    `Plot : Byte` and `HasInventory : Byte`, without synthesizing `ItemList`.
    Complete fresh browser readback and exact-candidate Toolset
    Save/Build/reopen certification.
17. `OFFLINE_VERIFIED 2026-08-26`: independently presence-sensitive
    `Hardness`, `Fort`, `Ref`, and `Will` native Bytes in `0..255`. Complete
    fresh browser readback and exact-candidate Toolset/NWN recertification.
18. `OFFLINE_VERIFIED 2026-08-26`: exact `HP`/`CurrentHP` Short pair with only
    HP editable in `1..10000` and CurrentHP derived by the recovered Toolset
    rule. Complete fresh browser readback and exact-candidate Toolset/NWN
    recertification.
19. `OFFLINE_VERIFIED 2026-08-27`: exact ordinal-paired GIC editor
    `Comment : CExoString`, including empty provenance and verbatim multiline
    targets. Complete fresh browser readback and exact-candidate Toolset
    Save/Build/reopen certification; no NWN behavior proof is applicable.
