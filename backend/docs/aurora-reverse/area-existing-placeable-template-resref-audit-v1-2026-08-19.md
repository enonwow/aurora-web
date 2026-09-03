# Existing Area Placeable `TemplateResRef` audit v1

Date: 2026-08-19
Status: source-closed; offline implementation verified; browser, Toolset, and NWN recertification pending

## Scope

This audit closes the bounded mutation contract for the exact
`TemplateResRef : ResRef` member of one retained type-`9` Area GIT Placeable.
It does not authorize changing `Appearance`, renderer asset identity, palette
identity, the source family ordinal, a UTP blueprint, or any other object
family. `PortraitId`, `Faction`, and `VarTable` remain separate scopes.

## Primary Aurora evidence

The primary source is the local Aurora Toolset decompilation
`C:\Projects\New Folder\export\decompiled_all.c`, SHA-256
`36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`.
The independently retained Toolset executable fingerprint is SHA-256
`4C15D74CE86AE3069FA2F8AFC8F3737179D6484BC991B460361D1260AA400F24`.
No xoreos or other GPL source was consulted.

Aurora's Placeable reader `FUN_0063ae68` calls `FUN_00aeef98` with the exact
label `TemplateResRef` and stores the result in the Placeable member at
`param_1 + 7`. The same routine reads `LocName`, `Description`,
`Conversation`, `Faction`, `PortraitId`, and the other Placeable members
separately; none is an alias for this value.

Aurora's paired writer `FUN_0063b8a0` calls `FUN_00aeffa4` with that same exact
label and the same member at `param_1 + 7`. `Faction` is written separately as
a DWord and `PortraitId` separately as a Word. This establishes exact ResRef
storage and independent serialization. It does not establish any safe reason
to reinterpret the value as `Appearance` or as a renderer model key.

## Admitted product profile

The v1 editor admits only an existing field that occurs exactly once with
native GFF type `ResRef` and contains `1..16` lowercase ASCII code units from
`[a-z0-9_]`. This deliberately narrow profile matches the effective resources
used by the current product while avoiding unproven case-folding, whitespace,
non-ASCII, empty-value, or malformed-byte behavior. Values outside the profile
are retained byte-for-byte but remain preserve-only.

The immutable source provenance is a presence-sensitive
`source.placeableTemplateResRef` string. The editable scene target is
`placeableProperties.advancedSettings.blueprintResRef`; it is not
`SceneObject.resRef`. The latter remains renderer/catalog identity and must
not change when this native property is edited. Basic and Advanced dialog
views may expose the same target, but they must stay synchronized and neither
may fall back to an unproven source.

The backend mutation is one exact pair:

```json
{
  "expectedResRef": "plc_watertrough",
  "resRef": "plc_watertrou_2"
}
```

The pair is optional and emitted only for a changed admitted value. Unknown
keys, missing keys, invalid values, unchanged pairs, absent or duplicate
native fields, wrong native types, stale expected values, wrong object family,
invalid family ordinals, and deletion collisions fail closed.

## Write and preservation contract

Planning resolves the retained object exclusively by immutable Placeable
family ordinal, reparses exactly one `TemplateResRef : ResRef`, and compares
the complete expected value. The writer replaces only that field, performs
whole-struct and receipt readback, and preserves every sibling GIT field and
the complete paired GIC bytes. The compiler must not resolve or rewrite a UTP:
this mutation changes the retained instance member only.

Existing Area authorization, optimistic locking, idempotency, draft
versioning, atomic publication, recovery, payload budgets, and API major
version remain unchanged. Diagnostics identify the Area, object ID, family
ordinal, native field, and validation stage without placing high-cardinality
values or paths in metric labels.

## Required tests and completion boundary

TDD coverage must include exact present storage, absence, empty, uppercase,
overlength, invalid characters, wrong/duplicate type, exact source/target
projection, stale and unchanged pairs, wrong family, deletion collision,
renderer `resRef` independence, Apply/OK/Cancel, clone/history preservation,
GIT whole-struct readback, GIC byte identity, and both production builds.
Mutation testing remains optional and requires explicit current-task opt-in.

Offline tests and builds do not replace fresh exact-candidate Toolset
Save/Build/reopen, packed readback, or NWN certification. Those remain the
native completion gate.

## Offline implementation checkpoint

The original implementation checkpoint covered the backend parser, snapshot
transport, draft projection, deletion planning, pair writer,
whole-struct/readback receipt, and candidate compiler, plus the frontend exact
validator, HTTP transport, mapper, immutable source provenance,
reducer/materializer, Advanced input, Apply chain, and clone/history snapshot.

The 2026-08-26 closure adds strict saved-workspace source/target validation,
an independent atomic-publication integration, and a complete dialog
regression. The workspace now rejects a wrong family or missing ordinal,
malformed immutable storage, missing or malformed targets, and an unproven
retained target. The transaction changes only the existing
`TemplateResRef : ResRef`, proves whole-candidate readback, and preserves the
paired GIC and IFO bytes. The UI regression proves Apply followed by OK, a
separate Cancel, another OK, reopen, and local Save while the renderer
`SceneObject.resRef` and immutable source value remain unchanged.

The accepted focused gate is eight backend unit suites with `1822/1822`
assertions, the Area Update integration suite with `35/35` assertions, and
eight frontend unit/regression suites with `414/414` assertions. Backend and
frontend production builds pass; the frontend retains only its existing
large-chunk advisory. Capability catalog revision `2026-08-26.57` records the
exact coverage and live-proof blockers. Mutation testing was not run because
it is optional and requires explicit current-task opt-in.

No Docker engine, container, managed service, watcher, browser, capture,
Toolset, NWN, or mutation-test process was started for this closure.
