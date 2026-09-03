# Existing Area Creature alignment audit v1

Date: 2026-08-28  
Status: `OFFLINE_IMPLEMENTED`; live browser, Toolset, and NWN release certification pending

## Decision

Aurora Web may replace the exact existing `GoodEvil : Byte` and
`LawfulChaotic : Byte` pair of one retained type-`4` Area GIT Creature as one
coupled compare-and-swap mutation. Both fields must be present exactly once,
with canonical values from `{0, 50, 100}`. A changed target is one of the nine
canonical alignments and rewrites both native fields in writer order. Missing,
duplicated, aliased, wrong-case, wrong-type, non-canonical, malformed, or stale
storage is `PRESERVE_ONLY`; this contract never creates or removes either
field.

The axes are:

| Web axis | Native label | Meaning |
| --- | --- | --- |
| moral | `GoodEvil` | `0 = Evil`, `50 = Neutral`, `100 = Good` |
| ethical | `LawfulChaotic` | `0 = Chaotic`, `50 = Neutral`, `100 = Lawful` |

The admitted label mapping is exact:

| Label | `GoodEvil` | `LawfulChaotic` |
| --- | ---: | ---: |
| `Lawful Good` | 100 | 100 |
| `Neutral Good` | 100 | 50 |
| `Chaotic Good` | 100 | 0 |
| `Lawful Neutral` | 50 | 100 |
| `True Neutral` | 50 | 50 |
| `Chaotic Neutral` | 50 | 0 |
| `Lawful Evil` | 0 | 100 |
| `Neutral Evil` | 0 | 50 |
| `Chaotic Evil` | 0 | 0 |

Alignment shifts, scripts, class restrictions, deity/race implications,
faction behavior, reaction, and NWN runtime alignment mechanics are outside
this storage slice.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` |
| installed retail `nwtoolset.exe` | `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24` |
| retail `TDLGCREATUREEDIT` RCDATA | `75E2DCFD5B0886DBB13BFB7CB32290CCCE842CADA84CFB806510ABDE52E7820E` |
| frozen RCDATA report | `3D9C5D29709BCF4AA037554781D229A2094F3D85370C44A6A5DF9A222F8D87FA` |

The RCDATA is the 52,662-byte `TPF0` form `TDLGCREATUREEDIT` at RVA
`0x00AE4698`. Static Delphi RTTI binds the form VMT at `0x00BBBEE4`, its
378-entry published field table at `0x00BBC054`, and `cbAlignment` at dialog
offset `0x7e8`. The combo has no mutation-side handler; load and final dialog
materialization own the mapping. No xoreos or other GPL source was consulted.

## Native storage findings

The common Creature reader `FUN_00532174` reads exact case-sensitive
`GoodEvil` and `LawfulChaotic` fields through the native Byte helper
`FUN_00aeed68` at decompiled lines `194717-194720`, stores them at Creature
offsets `0x9e` and `0x9f`, and uses `50` when a field is missing. Missing-field
fallback is not mutation authority.

The reciprocal common Creature writer `FUN_0053521c` writes those same offsets
and labels through `FUN_00aefd1c` at lines `195234-195235`, creating or
updating GFF type id `0` (`BYTE`). The placed-Creature type-`4` reader/writer
wraps this common path, so the pair belongs to the GIT record. Native creation
capability does not authorize Aurora Web to create absent retained storage.

## Toolset mapping findings

Creature-to-dialog materialization at decompiled lines `69752-69754` maps the
two byte slots into the alignment combo. For the canonical triples, the combo
index order is:

1. Lawful Good;
2. Lawful Neutral;
3. Lawful Evil;
4. Neutral Good;
5. True Neutral;
6. Neutral Evil;
7. Chaotic Good;
8. Chaotic Neutral;
9. Chaotic Evil.

Dialog-to-Creature materialization at lines `71029-71032` reads that one combo
selection and writes both Creature byte slots. Static bytes rooted at
`0x00BB0D56`/`0x00BB0D57` prove the nine reverse pairs listed above. The
Toolset therefore treats alignment as one coupled selector, not as two
independent web controls. Restricting retained authoring to the exact canonical
triple avoids silently normalizing legacy intermediate byte values.

## Frozen additive cross-boundary contract

Area detail may add:

```ts
type CreatureAlignmentByteStorage =
  | { present: false }
  | { present: true; nativeType: "byte"; value: 0 | 50 | 100 };

type CreatureAlignmentStorage = {
  goodEvil: CreatureAlignmentByteStorage;
  lawfulChaotic: CreatureAlignmentByteStorage;
};
```

The frontend retains a detached immutable copy under
`source.creatureAlignment`. The visible target remains
`creatureProperties.alignment` and must be one exact admitted label. Loose
metadata may populate legacy/seed presentation but never authorizes a retained
native write.

For a retained `aurora_git` Creature, the selector is `ACTIVE_NOW` only when
both exact source Bytes are present and canonical on a non-negative immutable
Creature ordinal. Every other retained state is visibly `PRESERVE_ONLY`. New
or seed Creature drafts may select one of the nine labels without claiming
retained native provenance.

A changed retained label adds one coupled mutation:

```json
{
  "alignment": {
    "expectedGoodEvil": 50,
    "expectedLawfulChaotic": 50,
    "goodEvil": 100,
    "lawfulChaotic": 100
  }
}
```

The source and target pairs must each be canonical and distinct. The member
may coexist with independently admitted Creature property mutations on the
same ordinal but never with deletion of that ordinal.

## Writer, transaction, diagnosability, and budgets

Parsing, projection, exact-ordinal planning, paired writing, and complete
candidate readback fail closed independently. Planning reparses both exact
case-sensitive native Bytes and performs full-pair CAS. Writing replaces only
the two existing fields in native order (`GoodEvil`, then `LawfulChaotic`),
preserves every sibling GIT field and byte-identical GIC/IFO resources, and
uses the existing authorized, idempotent, revision-fenced, journaled,
recoverable atomic ARE/GIT/GIC/IFO publication path.

No endpoint, binary body, pagination, chunking, streaming, authorization,
permission, idempotency, fencing, recovery, or transaction budget changes.
Routine diagnostics may expose only contract revision, Creature family,
bounded ordinal, approved alignment-pair token, stage, duration, and stable
result code. Values, labels, object IDs, hashes, raw bytes, source/storage
keys, credentials, and host paths are prohibited metric labels.

## Completion boundary

Offline closure requires strict pair parsing, exact Area-detail extraction,
HTTP validation, detached frontend scene/workspace/history state, explicit
selector gating, reducer plus final-Apply enforcement,
Apply/OK/reopen/local-Save regression, projection, exact-ordinal pair
planning, Byte-pair-only native writing, complete candidate readback,
combined-mutation coverage, atomic-publication integration, capability
evidence, and production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, and NWN inspection remain independent release gates.
This audit does not certify legacy intermediate alignment normalization,
absent-field creation/removal, arbitrary Creature templates, full Area CRUD,
renderer parity, PathConnect/WOK parity, or the 99-tileset program.

## Offline implementation outcome

The source-closed contract is implemented end to end:

- backend domain admission, exact GFF parsing, detached snapshot copying,
  process-cache identity, draft projection, immutable-ordinal planning, full
  pair CAS, native Byte replacement, candidate compilation, and atomic
  publication;
- frontend HTTP admission, detached scene provenance, exact label mapping,
  workspace validation/history cloning, one centralized nine-label palette,
  visible `ACTIVE_NOW`/`PRESERVE_ONLY` selector gating, reducer enforcement,
  final Apply materialization, and Apply/OK/reopen/local-Save regression;
- capability catalog revision `2026-08-28.80`, this audit evidence, and three
  explicit live-release blockers.

Bounded offline gates completed on 2026-08-28:

- backend focused unit suites: `2151/2151` passing across nine files;
- backend full Area Update atomic-publication integration: `59/59` passing;
- frontend focused unit/regression suites: `688/688` passing across eight
  files;
- backend Nest production build: passing;
- frontend TypeScript plus Vite production build: passing, with only the
  pre-existing large-chunk advisory.

No live release claim is made. The remaining alignment gates are a fresh
guarded browser readback, exact-candidate Toolset Save/Build/reopen with packed
GFF inspection, and NWN runtime inspection.

## Resource/process statement

This audit used read-only decompilation, PE resource inspection, Delphi RTTI
parsing, and bounded static x86 disassembly. The installed Toolset executable
was never started. No Docker command, service, watcher, browser, capture,
Toolset/NWN process, mutation test, xoreos source, or other GPL source was used.
Two early Jest invocations using the non-isolated unit config reached their
1 GB heap cap and terminated without starting a service. All subsequent
verification used the repository's isolated one-worker bounded config and a
separate process per test file so memory was released between suites.
