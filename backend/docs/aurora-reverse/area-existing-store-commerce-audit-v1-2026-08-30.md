# Existing Area Store commerce-vector audit v1

Date: 2026-08-30  
Status: offline retained-Store commerce CRUD and bounded CAS telemetry complete;
live certification pending  
Scope: exact retained Store commerce-vector read and compare-and-swap mutation
in the GIT `StoreList`

## Decision

Aurora Web may expose and mutate commerce values for an existing Store only
when its retained type-`11` GIT entry contains exactly one canonical field for
every member of this complete vector:

| Native field | Native type | API member | API domain |
| --- | --- | --- | --- |
| `MarkUp` | `Int` | `markUp` | signed int32 |
| `MarkDown` | `Int` | `markDown` | signed int32 |
| `BlackMarket` | `Byte` | `blackMarket` | boolean mapped only from/to `0` or `1` |
| `BM_MarkDown` | `Int` | `blackMarketMarkDown` | signed int32 |
| `IdentifyPrice` | `Int` | `identifyPrice` | signed int32 |
| `MaxBuyPrice` | `Int` | `maxBuyPrice` | signed int32 |
| `StoreGold` | `Int` | `storeGold` | signed int32 |

Admission is all-or-nothing. Missing, duplicated, differently cased, wrongly
typed, out-of-range, or noncanonical values do not create commerce provenance.
In particular, an Aurora reader default does not authorize Aurora Web to add a
field that is physically absent from the source GIT.

This slice does not authorize Store scripts, restrictions, variables,
inventory editing, identity mutation, arbitrary UTM authoring, or runtime
merchant-policy inference.

## Primary Aurora authority

The primary source is the frozen Aurora Toolset decompilation
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The identity was re-read on 2026-08-30 before this decision. No xoreos or other
GPL source was consulted.

The retained Store reader `FUN_0064188c` calls the common Store-property reader
`FUN_00640870` before placement parsing at lines 333298-333300. The common
reader obtains the exact scalar labels at lines 332810-332823:

- `MarkUp : Int`, default `0`;
- `MarkDown : Int`, default `0`;
- `BlackMarket : Byte`, default `0`;
- `BM_MarkDown : Int`, default `0`;
- `IdentifyPrice : Int`, default `100`;
- `MaxBuyPrice : Int`, default `-1`;
- `StoreGold : Int`, default `-1`.

The retained Store writer `FUN_00641ee0` delegates Store-property writing to
`FUN_00641058` at line 333559. That function writes the same seven labels
unconditionally with the native Int and Byte helpers at lines 333022-333028.
The separate inventory writer follows at line 333560. This proves the labels,
types, object members, and native read/write boundary; it does not prove
unbounded Toolset UI constraints or authorize missing-field synthesis.

## Independent fixture and native-record authority

The exact admitted retail blueprint is `x2_merc_dye.UTM`, 6,004 bytes,
SHA-256
`99b3050edf8697dfd053dbb335c12273de79ae1a16eebb242c354e727ae166e2`.
The immutable test fixture records the vector as `100`, `65`, `0`, `25`, `100`,
`-1`, `-1` with the exact native labels and types in
`backend/test/support/area-store-construction-fixture.ts`.

The independently saved Toolset module is
`codex_npc_item_live_20260713.mod`, SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.
Its retained evidence file
`evidence/area-store-construction-2026-08-13/native-toolset-instance-readback.json`
binds Area `demo`, Store ordinal `0`, GIT struct type `11`, 20 GIT fields, and
the exact expanded 55-item inventory. The construction fixture explains the
20 fields as five placement floats plus the 14 common non-inventory Store
fields and one expanded `StoreList`; the seven commerce fields are inside that
preserved common Store profile.

## Additive contract v1

Area detail may add:

```text
storeMetadata.commerce = {
  markUp,
  markDown,
  blackMarket,
  blackMarketMarkDown,
  identifyPrice,
  maxBuyPrice,
  storeGold
}
```

The frontend detaches the whole exact value into immutable
`source.storeCommerce` and initializes a separate
`storeProperties.commerce` target. A changed retained Store projects:

```text
{
  kind: "store",
  sourceIndex: <immutable Store ordinal>,
  commerce: {
    expectedValue: <complete exact source vector>,
    value: <complete distinct target vector>
  }
}
```

The independently admitted `editorComment` member may coexist in the same
property mutation. Both members are optional at the transport type level, but
at least one must be present and valid. Unknown members, partial vectors,
aliases, non-integers, values outside signed int32, stale expected values,
unchanged pairs, duplicate mutations, invalid ordinals, wrong families, and a
mutation plus deletion of the same Store ordinal fail closed with the existing
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID` envelope.

Planning reparses the exact retained Store. Writing replaces only the seven
existing scalar values at their original field positions and types. A
commerce-only update keeps GIC and IFO byte-identical, preserves every other
GIT field and ordering, and includes the normal deterministic ARE candidate in
the same revision-fenced publication. The unchanged Area scene remains
semantically identical; this contract does not require the regenerated ARE
serialization to be byte-identical. Complete candidate and persisted readback
must pass before publication. Existing authorization,
permission, approved-token, request and 256-KiB mutation budgets, optimistic
concurrency, idempotency, fencing, journal, rollback, recovery, receipt, and
ARE/GIT/GIC/IFO transaction contracts remain unchanged. No endpoint, binary
body, streaming, chunking, or major contract version is added.

## Diagnosability

The implemented additive event is `area_store_commerce_cas.v1` with bounded operations
`parse_source|admit_profile|plan|write|readback`, outcome, stable result code,
changed-field count, and duration. Commerce values, object identity, ordinal,
hashes, paths, source/storage keys, raw fields/bytes, credentials, and host
paths are prohibited from event fields and metric labels. Telemetry failure
must not affect validation, mutation, transaction, rollback, recovery, or
publication. The dedicated backend port and Nest adapter emit only these
bounded fields. Sink exceptions are swallowed and cannot alter compilation or
publication.

## Required implementation and evidence

1. [complete] Backend domain validation and exact complete-vector equality/clone helpers.
2. [complete] Parser admission and rejection for missing, duplicate, wrong-case,
   wrong-type, noncanonical Byte, and out-of-range native values.
3. [complete] Projector and planner complete-vector compare-and-swap, no-op, duplicate,
   wrong-family/ordinal, and deletion-collision coverage.
4. [complete] GIT writer mutation and readback, including coexistence with GIC
   Comment, exact unrelated-field preservation, commerce-only GIC/IFO byte
   identity, and inclusion of ARE/GIT/GIC plus IFO state in the atomic candidate.
5. [complete] Frontend HTTP boundary, detached provenance, scene mapping, clone, local
   draft, Store Properties UI, and regression coverage for all seven fields.
6. [complete] Dedicated bounded `area_store_commerce_cas.v1` backend telemetry emission.
7. [pending] One bounded browser Save/reopen proof after offline gates pass.
8. [pending] Fresh exact-candidate Toolset Save/Build/reopen and NWN runtime packets under
   the central proof route.

Product certification is `missing` until items 7 and 8 produce fresh accepted
artifacts. Offline tests and builds cannot replace either live proof axis.

## Offline verification record

The bounded backend lane passed 2,069 focused assertions across Store commerce
domain/parser, draft projection, immutable-ordinal planning, GIT/GIC writing and
readback, candidate compilation, content-free telemetry/sink isolation, and
module-snapshot repository mapping. The backend production build passed with a
1-GiB Node heap limit.

The bounded frontend lane passed 878 focused assertions across the HTTP
boundary, mapper, workspace/local-draft validation, deep cloning, dialog draft,
and rendered Store Properties controls. The frontend TypeScript and production
Vite build passed with one worker and a 1-GiB heap limit. Vite reported only its
pre-existing large-chunk advisory. No browser or native runtime was started, so
this record is offline evidence only.

## Resource-safety record

This audit used read-only decompilation, fixture, and saved native-readback
inspection only. It started no Docker command, service, watcher, browser,
capture, Toolset, NWN, mutation runner, or subagent. The installed
`aurora-toolset-prove` skill contract `1.0.15` governed evidence
classification. The operating standard references a
`powershell-command-runner` skill that is not installed in this session, so the
smallest native PowerShell read-only workflow was used instead.
