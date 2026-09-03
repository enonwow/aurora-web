# Existing Area Placeable `PortraitId` audit v1

Date: 2026-08-19
Status: source-closed; offline implementation verified; browser, Toolset, and NWN recertification pending

## Scope

This audit closes the bounded mutation contract for one canonical
`PortraitId : Word` member of one retained type-`9` Area GIT Placeable and its
binding to one physical row of the exact effective `portraits.2da`. It does not
authorize mutation of the legacy/fallback `Portrait : ResRef`, creature
portraits, `TemplateResRef`, `Faction`, `Appearance`, renderer identity, or any
other object family.

## Primary Aurora evidence

The primary source is the local Aurora Toolset decompilation
`C:\Projects\New Folder\export\decompiled_all.c`, SHA-256
`36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`.
The independently retained Toolset executable fingerprint is SHA-256
`4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
No xoreos or other GPL source was consulted.

Aurora's Placeable reader `FUN_0063ae68` calls the native Word reader
`FUN_00aeedc4` with the exact label `PortraitId`, stores the result in the
Placeable member at index `0x1e`, and distinguishes the canonical field from
the fallback `Portrait : ResRef`. Only when the canonical field is absent does
the reader obtain `Portrait` and convert that ResRef through the portrait
lookup. The paired writer `FUN_0063b8a0` calls the native Word writer
`FUN_00aefd88` with the exact label `PortraitId` and the same member.

The recovered portrait lookup routines `FUN_00514d6c`, `FUN_00515624`, and
`FUN_00522bac` open the `portraits` 2DA resource and read the exact
`BaseResRef` column by physical row. This establishes that the Word is a
physical `portraits.2da` row ordinal and that the visible ResRef is derived
display/asset identity, not the serialized GIT target.

The immutable dynamic-Placeable evidence packet records the effective vanilla
`portraits.2da` from `nwn_base.key` as 944,115 bytes, 16,001 physical rows, and
SHA-256
`b70e643efc226571e9502173781bcecb76de21ecdada0c7641479ee5dc467602`.
The evidence manifests are
`backend/docs/aurora-reverse/evidence/area-dynamic-placeable-native-proof-2026-08-19/aw_dp_proof_01.profile.json`
(SHA-256 `79d6257862f1f563682ec3ae73edd03a086756817184f1b67c8e5c91f1c1e890`)
and `aw_dp_proof_01.candidate.json` (SHA-256
`90916933de61b0bb56590542bace1c5e9b6ffd23d55c9cf4ea8115800ea549c1`).
This supersedes the original 4,096-row product assumption.

## Admitted product profile

The v1 editor admits only an existing `PortraitId` field occurring exactly
once with native GFF type `Word`, plus one exact effective `portraits.2da`.
The table must be `2DA V2.0`, contain exactly one `BaseResRef` column, contain
`1..65,536` physical rows, stay within 16 MiB, and carry no parser errors. Every
selectable row must have a lowercase ASCII BaseResRef matching
`[a-z0-9_]{1,16}`; `****` rows remain non-selectable. A malformed table fails
closed as a whole. The strongest module/ordered-HAK/vanilla resource wins and
weaker resources are never row-merged.

Area detail carries one optional shared digest-bound catalog, not one table per
Placeable. Its descriptor contains exact `resourceName`, `sourceObjectKey`,
`sourceLayer`, lowercase SHA-256, byte size, and physical row count. Ordered
catalog rows contain only exact `rowIndex` and `baseResRef`; sparse physical
ordinals are preserved. Maximum response growth is bounded by 65,536 rows, with
no new endpoint, pagination, streaming, or contract-major change.

The immutable frontend provenance contains the exact source Word plus table
digest and row count. The editable target is numeric
`placeableProperties.advancedSettings.portraitId`; the displayed
`portraitResRef` is derived from the selected table row. Neither value may
change `SceneObject.resRef` or `TemplateResRef`.

The optional backend mutation pair has exactly:

```json
{
  "expectedValue": 462,
  "value": 463,
  "tableSha256": "<64 lowercase hex>",
  "tableRowCount": 692
}
```

It is emitted only for a changed admitted physical row. Unknown or missing
keys, invalid Words, unsupported rows, stale digest/count/value, absent or
duplicate fields, wrong native type, unchanged values, wrong family/ordinal,
and deletion collision fail closed.

## Write, preservation, and diagnostics contract

Planning reparses the exact retained Placeable ordinal and canonical Word.
Compilation re-resolves the exact effective table descriptor and target row.
Writing replaces only `PortraitId : Word`, verifies full readback, preserves
every sibling GIT field, and preserves the paired GIC bytes exactly. It never
writes the fallback `Portrait` ResRef or a blueprint.

Existing authorization, optimistic locking, idempotency, atomic publication,
recovery, and API major version remain unchanged. Diagnostics identify Area,
object ID, Placeable ordinal, field, table source layer/digest stage, and
validation stage without placing paths or mutable values in metric labels.

## Offline implementation result

The complete bounded offline path is now verified. The backend retains the
canonical Word and exact effective-table provenance through parsing,
projection, stale-plan rejection, compilation, single-field writing, complete
readback, and revision-fenced atomic publication. The integration gate changes
physical row `462` to sparse physical row `15157`, observes
`PortraitId : Word`, and proves paired GIC and IFO byte identity.

The frontend validates the complete catalog/source/target relation again at
the saved-workspace boundary. It rejects malformed or missing catalogs, wrong
family or ordinal, stale digest/count, absent numeric targets, unsupported
sparse rows, mismatched derived BaseResRefs, and unproven retained targets. A
regression covers Apply followed by OK, a separate Cancel, another OK, reopen,
and local Save while retaining immutable expected-value provenance.

The accepted focused gate is nine backend unit suites with `1829/1829`
assertions, the Area Update integration suite with `34/34` assertions, and
eight frontend unit/regression suites with `396/396` assertions. Backend and
frontend production builds pass; the frontend retains only its existing
large-chunk advisory. Capability catalog revision `2026-08-26.56` records the
exact tests and remaining live-proof blockers. The corrected `65,536` table
budget is deliberate: immutable retail evidence contains `16,001` physical
rows, so the obsolete `4,096` bound rejected valid vanilla data.

No Docker engine, container, managed service, watcher, browser, capture,
Toolset, NWN, or mutation-test process was started for this closure.

## Required tests and completion boundary

TDD must cover exact/sparse table rows, resource precedence, digest and budget
rejection, exact Word presence, absent/duplicate/wrong-type fields, projection,
stale and unchanged pairs, unsupported rows, deletion collision, derived
ResRef mapping, renderer identity independence, Apply/OK/Cancel, clone/history,
whole-struct readback, GIC byte identity, full regression, and both builds.
Mutation testing remains optional and needs explicit current-task opt-in.

Offline gates do not replace fresh browser readback, exact-candidate Toolset
Save/Build/reopen, packed readback, portrait visual comparison, or NWN
certification.
