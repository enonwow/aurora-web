# Existing Area Door transition storage audit v1

Date: 2026-08-22  
Status: Frozen offline implementation authority; browser, Toolset, and NWN runtime certification pending

## Scope

This audit admits exact storage authoring for one retained entry in the GIT
`Door List` and only for the native field trio:

- `LinkedTo : CExoString`;
- `LinkedToFlags : Byte`;
- `LoadScreenID : Word`.

It does not decode `LinkedToFlags`, resolve `LinkedTo`, claim that a loading
screen row exists, create a missing field, author a new Door transition, move a
Door between hooks, or admit `TransitionDestin`, `TransitionDestination`,
`LinkedToModule`, `LinkedWaypoint`, or a case alias. Trigger transitions are a
separate family. No xoreos code or semantics were used.

## Immutable native evidence

The primary artifact is `C:\Projects\New Folder\export\decompiled_all.c`,
SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The retail Door load path `FUN_0055aba0` at
`decompiled_all.c:213598-213691` reads `LinkedTo` with the CExoString reader
`FUN_00aef090`, `LinkedToFlags` with the Byte reader `FUN_00aeed68`, and
`LoadScreenID` with the Word reader `FUN_00aeedc4`. The paired save path
`FUN_0055add4` at lines `213694-213703` writes the same state with the
CExoString, Byte, and Word writers `FUN_00af0084`, `FUN_00aefd1c`, and
`FUN_00aefd88` under the exact same labels.

An independent native common-object path corroborates the storage types:
`FUN_00656720` at lines `345687-346100` reads the same trio, and
`FUN_0065752c` at lines `346102-346126` writes the same trio. Existing
Toolset-derived UTD/GIT construction fixtures in this repository also emit
the exact labels and types.

The native decompilation does not contain `TransitionDestin`,
`TransitionDestination`, or `LinkedToModule`. Historical documents that used
secondary xoreos-derived runtime interpretations are quarantined under the
project GPL secondary-reference policy and are not implementation authority.
The native evidence proves field storage and round-trip shape only; it does
not close the meaning of any `LinkedToFlags` value or NWN traversal behavior.

## Admitted contract

Area detail may expose optional `doorTransition.storage` only for a Door List
entry whose struct type is exactly `8` and whose three fields are each unique
case-insensitively, exactly cased, and exactly typed. The bundle is
all-or-nothing. A missing, duplicate, wrong-case, wrong-type, or malformed
member leaves the native fields preserve-only.

The immutable value is:

```json
{
  "linkedTo": "destination_tag",
  "linkedToFlags": 1,
  "loadScreenId": 0
}
```

`linkedToFlags` is an uninterpreted integer in `0..255`. `loadScreenId` is an
uninterpreted integer in `0..65535`. `linkedTo` is retained exactly: no trim,
case fold, Unicode normalization, target lookup, or fallback is permitted. A
product boundary of `0..256` ECMAScript code units with no U+0000 is imposed
for bounded JSON/UI handling; this is not claimed as a native CExoString
limit. An existing value outside that profile remains preserve-only.

The frontend stores the immutable expected value in the object's source
metadata and the editable target in `doorTransition.storage`. Only a changed
target projects one complete exact CAS pair:

```json
{
  "expectedValue": {
    "linkedTo": "destination_tag",
    "linkedToFlags": 1,
    "loadScreenId": 0
  },
  "value": {
    "linkedTo": "new_destination_tag",
    "linkedToFlags": 1,
    "loadScreenId": 7
  }
}
```

Partial pairs, partial trio values, unknown keys, unchanged pairs, numeric
coercion, trimming, and synthetic defaults fail closed. A target difference
without admitted immutable provenance is an error rather than a no-op or field
creation.

## Mutation and preservation rules

The existing Area Update transaction binds the Door by immutable
`sourceGitSha256`, family `door`, and source ordinal. Immediately before the
write, the backend reparses the retained GIT, requires one exact Door List
entry of struct type `8`, verifies all three expected values, and replaces only
the three exact native fields. It then independently parses and compares the
candidate entry. The paired GIC and every unrelated GIT/ARE/IFO value remain
preserved unless another admitted mutation in the same transaction changes
them.

The mutation is fixed-size, adds no pagination or streaming, and remains under
the existing draft request budget. Diagnostics use bounded family/ordinal and
field labels; they do not expose binary bytes or host paths. Existing
authorization, optimistic locking, idempotency, journaling, atomic
publication, recovery, response envelopes, and API major version are
unchanged.

## Completion boundary

Offline completion requires exact parser provenance, repository/API mapping,
frontend boundary validation, immutable source/target separation, UI controls,
projector/planner/writer/candidate readback, companion preservation,
integration coverage, and backend/frontend builds.

Storage success is not transition behavior proof. Release remains blocked
until a fresh browser Save/reopen packet, exact-candidate Toolset
Save/Build/reopen packet, and NWN traversal/loading-screen behavior packet pass
without inventing the flag enum or destination semantics. Effective
`loadscreens.2da` labels are a separate query enhancement and are not required
for raw Word preservation.

## Offline implementation checkpoint — catalog revision 2026-08-22.23

The admitted storage-only slice is implemented end to end while the runtime
semantic boundary above remains unchanged:

- the parser exposes the optional all-or-nothing trio only from one exact
  type-`8` Door struct and retains immutable family/ordinal provenance;
- repository cloning, processed transport, and process-cache identity carry
  the storage without sharing mutable references;
- draft projection and deletion planning bind one complete expected/target
  tuple to the retained Door ordinal and reject stale, partial, unchanged,
  deleted, unretained, or malformed inputs;
- the pair writer verifies the source tuple immediately before replacement,
  changes only the three native GIT fields, independently reads the candidate,
  and retains the paired GIC byte-for-byte;
- the candidate compiler composes this property family with the existing
  atomic ARE/GIT/GIC/IFO publication path and reports one property update;
- frontend HTTP, scene, workspace, clone, and application boundaries keep
  source provenance separate from the editable target; new/copied Doors never
  inherit existing-instance storage authority;
- the Door Properties Transition tab edits only the exact native trio when the
  source is eligible. Legacy destination/module/waypoint/loading-screen aliases
  remain disabled preserve-only neighbors.

Accepted bounded evidence on the mandatory 1 GiB test profile:

- 7 backend suites, 1619/1619 assertions;
- 1/1 atomic-publication integration assertion with independent candidate GIT
  readback, `readbackStatus=verified`, and byte-identical GIC;
- 12 frontend suites, 216/216 assertions, including the regression-smoke UI
  flow and provenance-safe copy/drag-drop behavior;
- 12/12 capability-catalog assertions;
- passing backend and frontend production builds.

Capability `objects_door_hooks_transitions` therefore advances from
`missing/preserve_only/blocked` to `verified/partial/blocked`. Catalog totals
are 48 implemented, 27 partial, 0 preserve-only, and 4 not-started; release
totals remain 38 available, 36 blocked, and 5 hidden. The capability is not
release-complete until fresh browser, Toolset, NWN traversal/loading-screen,
and DWK/WOK accessibility proof closes the explicit blockers.
