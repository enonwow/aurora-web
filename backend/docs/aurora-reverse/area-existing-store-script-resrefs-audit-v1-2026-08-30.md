# Existing Area Store script-ResRef audit v1

Date: 2026-08-30  
Status: offline implementation verified; guarded browser and native live
certification pending  
Scope: exact retained Store `OnOpenStore` and `OnStoreClosed` read and
compare-and-swap mutation in the GIT `StoreList`

## Decision

Aurora Web may expose the Store event-script pair only when one retained
type-`11` GIT entry contains exactly one canonical field for both members:

| Native field | Native type | API member | API domain |
| --- | --- | --- | --- |
| `OnOpenStore` | `ResRef` | `onOpenStore` | source ASCII `[A-Za-z0-9_]{0,16}`, target canonical lowercase `[a-z0-9_]{0,16}` |
| `OnStoreClosed` | `ResRef` | `onStoreClosed` | source ASCII `[A-Za-z0-9_]{0,16}`, target canonical lowercase `[a-z0-9_]{0,16}` |

Admission is all-or-nothing. Missing, duplicated, differently cased, wrongly
typed, unreadable, or out-of-domain storage does not create script provenance.
Aurora reader defaults do not authorize Aurora Web to synthesize a physically
absent field. Empty `ResRef` values are canonical and remain editable.

This slice does not authorize Store variables, buy restrictions, inventory,
identity mutation, arbitrary UTM authoring, script compilation, script
existence inference, or merchant runtime-behavior claims.

## Primary Aurora authority

The primary source is the frozen Aurora Toolset decompilation
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
Its identity was re-read on 2026-08-30. No xoreos or other GPL source was
consulted.

The retained Store reader `FUN_0064188c` calls the common Store-property reader
`FUN_00640870` at line 333298. The common reader reads `OnOpenStore` and
`OnStoreClosed` through the native ResRef helper at lines 332825-332832 and
stores the two values in distinct Store members. It then reads `WillNotBuy`,
`WillOnlyBuy`, and the variable table through separate paths. This separates
the two event scripts from restrictions and variables.

The retained Store writer `FUN_00641ee0` calls the common writer
`FUN_00641058` at line 333559. The common writer emits both exact ResRef labels
unconditionally at lines 333029-333030, before the independent restriction and
variable-table writers. This proves both labels, native types, object members,
and the read/write boundary. It does not prove script-resource existence or
NWN execution behavior.

## Independent fixture and native-record authority

The admitted retail blueprint `x2_merc_dye.UTM`, SHA-256
`99b3050edf8697dfd053dbb335c12273de79ae1a16eebb242c354e727ae166e2`,
contains exactly one `OnOpenStore : ResRef` and one
`OnStoreClosed : ResRef`, both empty. Their exact field order and types are
frozen by `backend/test/support/area-store-construction-fixture.ts`.

The independently saved Toolset module
`codex_npc_item_live_20260713.mod`, SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`,
binds Area `demo`, Store ordinal `0`, GIT struct type `11`, and the same
expanded retail Store profile. Its retained native record is
`evidence/area-store-construction-2026-08-13/native-toolset-instance-readback.json`.
That artifact proves the immutable Store lineage and structure, but it is not
a fresh mutation or NWN script-execution proof.

## Additive contract v1

Area detail may add:

```text
storeMetadata.scriptResRefs = {
  onOpenStore,
  onStoreClosed
}
```

The frontend detaches the complete exact pair into immutable
`source.storeScriptResRefs` and initializes a separate
`storeProperties.scriptResRefs` target. A changed retained Store projects:

```text
{
  kind: "store",
  sourceIndex: <immutable Store ordinal>,
  scripts: {
    expectedValue: <complete exact source pair>,
    value: <complete distinct canonical target pair>
  }
}
```

The independently admitted `editorComment` and `commerce` members may coexist
on the same Store mutation. Each member is optional at the transport type
level, but at least one complete changed member must be present. Unknown keys,
partial pairs, aliases, noncanonical target ResRefs, stale or unchanged pairs,
duplicate mutations, wrong families or ordinals, and mutation plus deletion
of the same Store fail closed with the existing
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID` envelope.

Planning reparses the exact retained Store and compares the complete pair.
Writing replaces only the two existing ResRef values at their original field
positions and types. A scripts-only update keeps GIC and IFO byte-identical,
preserves every unrelated GIT field and ordering, and carries the ordinary
deterministic ARE candidate inside the same revision-fenced ARE/GIT/GIC/IFO
transaction. Candidate and persisted readback must reproduce the complete
target pair before publication. Existing authorization, permission,
approved-token, request and 256-KiB mutation budgets, optimistic concurrency,
idempotency, fencing, journal, rollback, recovery, receipts, endpoint,
streaming, chunking, and API-major contracts remain unchanged.

## Diagnosability

The additive event is `area_store_script_resrefs_cas.v1` with bounded
operations `parse_source|admit_profile|plan|write|readback`, outcome, stable
result code, changed-field count, and duration. Script ResRefs, object
identity, ordinal, hashes, paths, source/storage keys, raw fields or bytes,
credentials, and host paths are prohibited from event fields and metric
labels. Telemetry failure must not affect validation, writing, transaction,
rollback, recovery, or publication.

## Required implementation and evidence

1. [complete] Backend exact-pair domain validation and immutable clone/equality helpers.
2. [complete] Parser admission and rejection for missing, duplicate, wrong-case,
   wrong-type, invalid, and over-length physical values.
3. [complete] Projector and planner complete-pair CAS, no-op, duplicate,
   wrong-family/ordinal, and deletion-collision coverage.
4. [complete] GIT writer mutation/readback, coexistence with Comment and
   commerce, unrelated-field preservation, scripts-only GIC/IFO byte identity,
   and atomic candidate coverage.
5. [complete] Frontend HTTP boundary, detached provenance, scene mapping, clone,
   local draft, Store Properties controls, and regression coverage.
6. [complete] Content-free `area_store_script_resrefs_cas.v1` telemetry and
   sink-failure isolation.
7. [pending] One fresh guarded browser Save/reopen proof.
8. [pending] Fresh exact-candidate Toolset Save/Build/reopen and NWN execution
   proof for both hooks under the central proof route.

Proof completeness remains `missing` until the browser and native runtime
artifacts are fresh, identity-bound, visually inspected where applicable, and
accepted by their canonical validators. Offline tests cannot replace those
proof axes.

## Accepted offline verification

The implementation was developed against red tests and verified sequentially
with one bounded worker/process at a time. Accepted checks are:

- backend Store script domain and parser: `18/18`;
- backend retained mutation projection/planning/writer/repository: `1914/1914`;
- backend complete candidate compiler and telemetry: `149/149`;
- capability catalog revision and evidence/blockers: `13/13`;
- frontend Store script domain: `8/8`;
- frontend HTTP/mapper/workspace/clone/local-draft/dialog flow: `885/885`;
- frontend Store Properties Apply/Cancel/OK regression smoke: `1/1`;
- backend production build: pass;
- frontend production build: pass, with only the pre-existing large-chunk
  advisory.

These counts are scoped checks, not a replacement for the still-missing live
proof axes or a claim that overall Store/Area authoring is complete.

## Resource-safety record

The audit and implementation used read-only decompilation, fixture, and
retained native-record inspection plus sequential bounded tests and production
builds. It started no Docker command, service, watcher, browser, capture,
Toolset, NWN, mutation runner, or subagent. Evidence classification follows
`aurora-toolset-prove` skill-suite contract `1.0.15`; because no live proof was
started, no function runner or proof profile was invoked.
