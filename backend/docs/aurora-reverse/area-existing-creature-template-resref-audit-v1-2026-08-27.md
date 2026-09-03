# Existing Area Creature `TemplateResRef` audit v1

Date: 2026-08-27  
Status: source-closed and offline implementation complete; fresh product certification pending

## Decision

Aurora Web may replace the exact existing `TemplateResRef : ResRef` field of
one retained type-`4` Area GIT Creature. The mutation identifies the retained
instance by its immutable Creature family ordinal and compares the complete
native source value before writing. It does not resolve or rewrite a UTC,
change palette identity, change renderer/catalog `SceneObject.resRef`, create
a new Creature, or authorize any other Creature property.

The bounded v1 editor admits only exactly one present canonical ResRef with
`1..16` lowercase ASCII code units matching `[a-z0-9_]`. Empty, uppercase,
non-ASCII, invalid-character, overlength, missing, duplicated, wrong-case, or
wrong-type storage remains visible but `PRESERVE_ONLY`. This deliberately
narrow profile avoids depending on Aurora's writer-side ASCII case folding or
on unproven namespace behavior.

## Immutable primary authority

The admitted read-only sources are:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
  SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

No xoreos or other GPL source was consulted or used. No Docker, service,
watcher, browser, Chrome, Toolset mutation, NWN run, capture, or mutation-test
process was started for this audit.

## Native storage closure

The common Creature reader `FUN_00532174` begins at
`decompiled_all.c:193907`. At lines `194117-194119` it calls
`FUN_00aeef98` with the exact label `TemplateResRef` and copies the result to
the common Creature member at `+0x1c`. The paired common writer
`FUN_0053521c`, beginning at line `195081`, calls `FUN_00aeffa4` with the same
member and label at line `195134`.

The generic reader `FUN_00aeef98` at lines `968043-968110` accepts only GFF
field type ID `0x0b`, the native ResRef type, and copies its length-prefixed
payload. The generic writer `FUN_00aeffa4` at lines `968883-968931` creates or
addresses the same type ID `0x0b` and serializes the complete ResRef. Its
lines `968917-968925` fold ASCII uppercase bytes to lowercase. Web authoring
does not rely on that normalization: admitted targets are already canonical.

The placed-Creature reader `FUN_0053ab24` calls the common reader at line
`197530`; the placed-Creature writer `FUN_0053ae80` calls the common writer at
line `197590`. This establishes the exact type-`4` Area GIT lineage and keeps
the instance field independent from its paired GIC record.

## Toolset presentation closure

The immutable RCDATA form `TDLGCREATUREEDIT` contains the Advanced-tab tokens
`tsAdvanced`, `lResRef`, visible label `Blueprint ResRef`, editor `eResRef`,
and handlers `eResRefChange` and `eResRefExit`. The dialog load path
`FUN_0044b110` copies the common Creature member at `param_2 + 0x1c` into the
dialog member at byte offset `0xabc` on line `69435`. The save/apply path
`FUN_0044d360` copies the dialog member at `param_1 + 0xabc` back to the same
common member on line `70573`. The canonical common writer then emits the
exact native field.

This closes the Toolset control-to-storage identity. It does not prove that a
free-form string outside the bounded product profile is safe to author.

## Frozen additive cross-boundary contract

Area detail may add this presence-sensitive fact to a type-`4` placement:

```ts
type CreatureTemplateResRefStorage =
  | { present: false }
  | { present: true; nativeType: "resref"; value: string };
```

Only a retained `aurora_git` Creature with a non-negative immutable family
ordinal and one admitted value receives detached immutable frontend source
provenance:

```ts
source.creatureTemplateResRef = { expectedResRef: string };
```

The editable target is
`creatureProperties.advancedSettings.blueprintResRef`. It is deliberately
separate from `SceneObject.resRef`, Creature appearance identity, and catalog
or UTC identity. A changed target projects exactly:

```ts
templateResRef: {
  expectedResRef: string;
  resRef: string;
};
```

Both members must independently match the admitted profile and differ.
Unknown keys, malformed values, unchanged pairs, missing provenance, wrong
family/ordinal, stale source, deletion collision, or aliasing another object
identity fails closed.

## Projection, write, and diagnostics contract

HTTP parsing validates the exact storage shape. Scene mapping binds provenance
only for the complete admitted retained-object state. Saved-workspace
validation repeats the source/target/family/ordinal relationship. The dialog
input is `ACTIVE_NOW` only for that state; every other state is visible and
disabled as `PRESERVE_ONLY`.

Projection emits the optional changed pair. Planning reparses the exact
retained type-`4` ordinal, requires one canonical case-sensitive
`TemplateResRef : ResRef`, and compares the immutable expected value.
Writing replaces only that field, verifies the complete paired GIT structure
and mutation receipt, and preserves every sibling GIT field and all paired GIC
bytes. Whole-candidate readback must verify the target while the ARE follows
the pre-existing Area Update candidate publication, IFO and GIC remain
byte-identical, and unrelated resources remain unchanged except for
independently admitted mutations in the same transaction.

Existing authorization, permissions, optimistic concurrency, idempotency,
module fencing, journal, recovery, atomic publication, and API v1 budgets are
unchanged. Routine telemetry may expose only the contract revision, object
family, bounded ordinal, approved `TemplateResRef` field token, stage,
duration, and stable result code. Values, object IDs, hashes, raw fields or
bytes, source/storage keys, and host paths are excluded from metric labels.

## Test-first exit criteria and proof boundary

The offline slice is implemented through the backend domain, presence-sensitive
GFF parser, source/target projector, exact-ordinal planner, field-only writer,
candidate compiler, snapshot clone, process fingerprint, and atomic publication.
The frontend implements the strict HTTP boundary, detached scene provenance,
saved-draft validation, history clone, dialog control state, guarded Apply, and
renderer-identity separation. Capability catalog revision
`2026-08-27.72` records the tests, this audit, and the three remaining live
proof blockers.

The latest bounded closure run passed:

- backend focused unit gate: 8 suites, 2,014 tests;
- backend capability-catalog gate: 1 suite, 13 tests;
- backend Area Update integration gate: 1 suite, 51 tests;
- frontend focused unit/regression gate: 9 files, 577 tests;
- backend and frontend production builds.

No Docker, dev server, watcher, browser, Chrome, Toolset mutation, NWN run,
capture, or mutation-test process was started during implementation or these
offline gates.

The completed offline implementation covers strict domain tests; parser
present/absent/duplicate/wrong-case/wrong-type coverage; projection and stale
source rejection; exact-ordinal planning; field-only write and full readback;
combined Creature property publication with GIC/ARE/IFO identity; HTTP,
mapping, saved-draft, clone/history, Apply/OK/Cancel/reopen/local-Save and
renderer-identity independence; focused integration; and both bounded
production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
plus packed GFF readback, and NWN verification remain release gates. Offline
tests and builds do not complete the overall Creature, Area CRUD, renderer,
connectivity, or tileset program.
