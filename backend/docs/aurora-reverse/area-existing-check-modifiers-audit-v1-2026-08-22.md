# Existing Area Listen/Spot check modifiers audit v1

Date: 2026-08-22  
Status: Frozen offline implementation authority; browser and native runtime certification pending

## Scope

This audit admits exact existing-Area authoring for the two Advanced-tab
check modifiers stored in the root ARE struct:

- `ModListenCheck : Int`;
- `ModSpotCheck : Int`.

It extends the existing preserve-first Area Update transaction. It does not
admit `LoadScreenID`, `VarTable`, another Area property, field creation, or a
default inferred from field absence. No xoreos source was used.

## Immutable evidence

The frozen local Aurora decompilation artifacts are:

- `decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- `strings.tsv`, SHA-256
  `864ae0139451d5333307cb2bbccce725bbd2d2c6056ac2d5f80f9b5ea50f190f`.

In `FUN_005a7fc8`, `decompiled_all.c:255196-255199` reads
`ModSpotCheck` and `ModListenCheck` through the same native signed-Int GFF
reader and stores each complete 32-bit value in the Area state. In
`FUN_005a9f30`, lines `255886-255887` write both state values through the
native Int writer under the same exact labels. The existing project GFF
fixtures independently identify both root fields as `Int`.

The installed retail `nwtoolset.exe` has SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
Its `TDLGAREAPROPERTIES` RCDATA is 16,478 bytes with SHA-256
`17903f30797a851c826320ac63aaa450db4813a41f4236766ea080f109df8c16`.
The binary Delphi form contains:

- `eModifierListenCheck` associated with `udModifierListenCheck`;
- `eModifierSpotCheck` associated with `udModifierSpotCheck`;
- `OnCheckModifierExit` on both edits;
- `Min` encoded as signed `vaInt8` byte `0x9d` (`-99`);
- `Max` encoded as signed `vaInt8` byte `0x63` (`99`);
- edit `MaxLength=3`.

The same resource labels the controls `Check Modifier - Listen` and
`Check Modifier - Spot`. This closes the exact Toolset authoring domain as
integer `-99..99`; a wider raw Int storage domain is not an editable-product
domain.

The Area Properties state transfer is also direct: `FUN_00553710` at
`decompiled_all.c:209777-209778` copies both 32-bit Area values into the
dialog state, and `FUN_0055404c` at lines `209928-209929` copies them back.
There is no boolean inversion, scale, alias, or shared-field packing in this
path.

## Admitted contract

Area detail exposes each value independently only when the root ARE contains
exactly one case-sensitive field with the exact native type and an integer in
`-99..99`. Empty/absent, duplicate, wrong-case, wrong-type, and out-of-range
storage are distinct preserve-only states.

The existing `advancedFlags` payload gains optional
`listenCheckModifier` and `spotCheckModifier` numbers. A requested change is
one complete exact pair:

```json
{
  "listenCheckModifier": { "expectedValue": 0, "value": -4 },
  "spotCheckModifier": { "expectedValue": 2, "value": 7 }
}
```

Both members are integers in `-99..99`. Only changed pairs are legal. The
backend reparses the retained ARE, requires exact expected-value equality,
replaces only the requested existing Int field, and independently parses the
candidate for exact readback. It never materializes a missing field or clamps,
rounds, normalizes, or silently ignores a value.

The frontend keeps immutable source provenance separate from the editable
target. A control is active only for admitted provenance; otherwise it remains
visible and disabled as `PRESERVE_ONLY`. Apply without admitted provenance
cannot create a mutation. Cancel/undo/reopen preserve the immutable source.

## Preservation, diagnostics, and budgets

Unrequested ARE fields and every GIT, GIC, and IFO companion remain exact.
Authorization, draft identity, optimistic locking, idempotency, journaling,
atomic publication, recovery, request/response budgets, and API v1 identifiers
do not change. The two fixed-size pairs need no pagination, chunking, or
streaming.

Invalid source or mutation shapes fail at the existing strict boundary with a
field path under `advancedFlags.listenCheckModifier` or
`advancedFlags.spotCheckModifier`. Stale source values fail before writing.
Candidate drift fails independent readback. Diagnostics remain bounded and do
not expose binary bytes or host paths.

## Completion boundary

Offline implementation requires domain, schema, parser, projector, writer,
candidate-readback, cache-key, repository/service, HTTP adapter, facade, UI,
round-trip, companion-preservation, integration, and build gates. Browser UI
proof and exact-candidate Toolset Save/Build/reopen plus NWN behavioral proof
remain separate release blockers. `LoadScreenID` stays preserve-only until an
effective `loadscreens.2da` physical-row contract and selector are complete.
