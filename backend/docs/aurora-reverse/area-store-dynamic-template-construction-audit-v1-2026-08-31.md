# Dynamic effective-catalog Store construction audit v1

Date: 2026-08-31  
Status: `OFFLINE_IMPLEMENTATION_COMPLETE`; primary static semantics, the bounded
retail-corpus admission profile, and the application pipeline are source-closed;
browser and native live certification remain open

## Decision

Aurora Web may replace the single-blueprint Area Store Create limitation with
one effective-catalog profile named `effective-catalog-utm-store-copy-v1`.
The profile admits only a current repository-owned `UTM `/`V3.2` root whose
immutable catalog identity is carried without bytes through the frontend and
re-resolved by the backend at compilation time.

The first dynamic profile admits the exact native five-bucket repository order
`[0,4,2,3,1]` and only `InventoryRes` entries with Word coordinates and the
optional canonical `Infinite : Byte = 1`. Random-list and embedded-struct UTM
entries remain rejected because they are not present in the first-party retail
corpus used for this decision and their placement semantics are not needed to
generalize that corpus.

## Primary Aurora authority

The frozen Toolset decompilation is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos or other GPL source was consulted.

The common Store reader `FUN_00640870` reads the exact scalar and script
members at decompiled lines `332810-332830`, including defaults `MarkUp=0`,
`MarkDown=0`, `BlackMarket=0`, `BM_MarkDown=0`, `IdentifyPrice=100`,
`MaxBuyPrice=-1`, and `StoreGold=-1`. It reads `WillNotBuy` and `WillOnlyBuy`
as ordered BaseItem lists at lines `332831-332861`.

The UTM repository reader `FUN_00640f14` dispatches five repository types at
lines `332952-332981`. The reciprocal UTM repository writer `FUN_0064138c`
creates those types in physical order `0,4,2,3,1` at lines `333113-333133`.
The common writer `FUN_00641058` writes the signed-Int commerce fields, both
script ResRefs, and both restriction lists at lines `333016-333060`. The outer
UTM writer at lines `341898-341903` writes the common profile, repository,
`ID : Byte`, and `Comment : CExoString`. The retained GIT Store writer
`FUN_00641ee0` writes placement, paired GIC Comment, common fields, and expanded
repository state at lines `333538-333560`.

## Independent first-party retail corpus

The installed-resource extract at
`C:/Projects/New Folder/item-retail-extract/utm` contains 42 parsed retail UTM
files. A bounded read-only aggregate on 2026-08-31 established:

- all 42 use bucket order `[0,4,2,3,1]`;
- all 4,597 repository entries are `InventoryRes` references;
- 3,842 entries contain canonical `Infinite=1`; 755 omit the field;
- the maximum bucket contains 136 entries;
- the maximum complete Store contains 211 entries and 211 distinct ResRefs;
- every repository entry struct type equals its zero-based physical ordinal;
- field order varies, so admission is label/type based and duplicate-sensitive,
  never positional inside an entry.

The root corpus has three native field-order/presence variants. Thirty-seven
files omit the newer IdentifyPrice/MaxBuyPrice/StoreGold/OnStoreClosed and
restriction members, three older general-store files use a different physical
root order, and two expansion files carry the complete 17-field profile. This
matches the decompiled reader-default contract and prohibits an exact-order
assumption for source UTM roots.

## Additive contract and safety profile

The binary-free provenance tuple contains source kind/profile, stable catalog
template ID, native ResRef and Tag, object key, exact byte size and SHA-256,
and GFF identity. The backend re-resolves the current effective UTM and every
referenced effective UTI. Source or precedence drift is a conflict, not a
fallback.

The root UTM is capped at 1 MiB. The dependency graph permits at most 1,024
reference occurrences, 256 unique UTIs, eight nested Item levels, and 16 MiB
of unique dependency bytes. The complete dependency set is first-discovery
ordered and must be fully consumed by candidate construction. Each BaseItem is
validated against one immutable effective `baseitems.2da` snapshot. Cycles,
unused or missing dependencies, digest drift, malformed GFF, duplicate native
members, invalid repository grammar, and budget overflow fail closed.

## Required implementation and proof

1. [complete offline] Canonical module-backed UTM writer and complete commerce/script
   request fields.
2. [complete offline] Dynamic Store frontend provenance profile and catalog mapper.
3. [complete offline] Workspace/projector admission for the dynamic profile.
4. [complete offline] Effective UTM plus recursive UTI dependency resolution.
5. [complete offline] Generic Store-to-GIT conversion through the existing dynamic Item
   conversion path, complete candidate readback, and atomic publication.
6. [complete offline] Focused unit, round-trip, compiler, repository, frontend,
   and fail-closed gates. Production builds remain recorded separately below.
7. [pending] Guarded browser Save/reopen proof.
8. [pending] Exact-candidate Toolset Save/Build/reopen and applicable NWN
   merchant behavior proof.

Capability revision `2026-08-31.118` removes the former arbitrary Store-template
implementation blocker. Release remains blocked by the explicit browser,
Toolset, and applicable NWN runtime proof axes; this audit does not convert an
offline test result into a live-rendering claim.

## Offline validation record

- Dynamic Store writer and fail-closed profile: `7/7` passed.
- Area update compiler, including effective UTM plus UTI expansion: `158/158`
  passed.
- Atomic publication/readback case for dynamic Store: `1/1` passed.
- Frontend wizard, provenance, mapper, and panel: `49/49` passed.
- Capability catalog revision: `13/13` passed.
- Backend and frontend production builds passed. The frontend retained the
  pre-existing large-chunk advisory.
- The broader seven-file backend run reached `1031/1032`; its only failure is
  outside this lane in the ASCII-emitter expectation, where production now
  returns an additional `sourceModelHash`. No Store/Area assertion failed.

## Resource statement

This audit used only bounded read-only inspection of the frozen decompilation,
the first-party retail UTM extract, and repository code. It started no Docker
command, service, watcher, browser, capture, Toolset, NWN, mutation runner, or
subagent.
