# Existing Area multi-entry inline Name mutation audit v1

Date: 2026-08-25  
Status: source-closed bounded profile admitted; browser and native proof pending

## Decision

Aurora Web may edit the default language-0/gender-0 substring of an existing
Area `Name : CExoLocString` when the complete retained value is an exact,
lossless inline printable-ASCII profile:

- `strRef` is exactly `0xffffffff`;
- the list contains `1..64` ordered entries;
- every numeric GFF substring identifier is an unsigned 32-bit value and is
  unique in the retained list;
- exactly one entry has identifier `0`;
- every substring contains `0..16,384` bytes, every byte is printable ASCII
  `0x20..0x7e`, and aggregate text is at most `65,536` bytes;
- identifier `0` contains `1..256` bytes and is not whitespace-only.

The web Name control changes only identifier `0`. Every other entry keeps its
numeric identifier, order, byte length, and exact ASCII bytes. The source
`strRef` remains `0xffffffff`. A one-entry value is the existing
`simple_inline_ascii` profile; more than one entry is the additive
`multi_entry_inline_ascii` profile.

TLK-backed values, absent/empty default entries, duplicate identifiers,
non-ASCII bytes, malformed payloads, and over-budget values remain
preserve-only. Alternate entries are preserved but are not independently
editable in this checkpoint. Area ResRef rename remains a separate
transaction.

## Primary Aurora evidence

Primary artifacts:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

No xoreos or other GPL source was inspected or used.

### Generic CExoLocString reader and writer

At `decompiled_all.c:968351`, `FUN_00aef678` accepts only GFF type `0x0c`.
It reads the complete payload header (`totalSize`, `strRef`, and entry count),
then consumes every ordered substring record. The stored GFF identifier is
split into:

```text
language = signedIdentifier / 2
gender = signedIdentifier & 1
```

and passed to the localized-string setter `FUN_00acdf2c`.

At `decompiled_all.c:968986`, `FUN_00af0144` writes GFF type `0x0c`. It writes
the retained `strRef`, the complete native entry count, and every native map
entry. The GFF identifier is reconstructed as:

```text
language * 2 + gender
```

Therefore GFF identifier `0` is exactly language `0`, gender `0`; other
identifiers are real siblings of the same native value rather than an
uninterpreted display alias.

### Native setter, remover, and full-value copy

At `decompiled_all.c:948003`, `FUN_00acdf2c` inserts or replaces the map entry
at `language * 2 + gender`. For language `0`, it forces gender `0`. At
`decompiled_all.c:948295`, `FUN_00ace524` removes the same key and likewise
forces gender `0` for language `0`.

At `decompiled_all.c:947990`, `FUN_00acdefc` copies both the complete entry map
and `strRef`. The Area Properties transfer functions use that full-value copy:

- `FUN_00553710` copies Area member `+0x94` to dialog member `+0x648`;
- `FUN_0055404c` copies dialog member `+0x648` back to Area member `+0x94`.

The Area Name is therefore a complete localized value in the dialog, not the
visible `TEdit` string alone.

### Toolset localized editor behavior

RCDATA form `TDLGAREAPROPERTIES` contains `eName` and `bAreaName`. The Toolset
localized-string editor receives and copies the complete value in
`FUN_0070e4d0`. On commit, `FUN_0070e8ec` removes the selected entry when the
edit text is empty and otherwise inserts or replaces only that selected
language/gender key. It does not flatten sibling entries.

The generic resolver `FUN_00ace0dc` performs exact language/gender lookup,
opposite-gender fallback, TLK lookup through `strRef`, language-0 fallback,
and additional fallback-language probes. That behavior is why this checkpoint
does not rewrite TLK-backed storage or claim that one web text field is the
complete multilingual editor.

## Frozen additive contract

`AreaBasicIdentity` additively exposes `nameProfile` only together with an
editable `name`:

```json
{
  "name": "Crypt",
  "nameProfile": "multi_entry_inline_ascii",
  "tag": "crypt_tag"
}
```

The two profile tokens are `simple_inline_ascii` and
`multi_entry_inline_ascii`. Missing or inconsistent profile metadata fails
closed on the frontend and never authorizes a mutation.

An Area Name CAS pair additively carries `expectedProfile`:

```json
{
  "name": {
    "expectedValue": "Crypt",
    "value": "Deep Crypt",
    "expectedProfile": "multi_entry_inline_ascii"
  }
}
```

For backward compatibility an old two-key pair remains admitted only when the
retained source is `simple_inline_ascii`. New clients send
`expectedProfile`. Unknown keys, missing source metadata, a profile mismatch,
stale default text, unchanged values, or an unsupported source fails closed.

The complete request remains bounded by the existing Area update payload and
resource fingerprint. No new endpoint, streaming, pagination, or binary body
is introduced. Logs may record only the profile token, entry count, stage, and
stable result code; they must not record names, alternate text, ResRefs, raw
bytes, or host paths.

## Writer and readback requirements

The writer must independently reparse the exact retained `Name` payload. It
must replace exactly the identifier-`0` bytes, preserve the source entry order
and every sibling tuple, retain `strRef=0xffffffff`, and leave all unrelated
ARE fields plus GIT/GIC/IFO companions unchanged.

Candidate and persisted readback must prove:

1. target identifier `0` equals the requested printable-ASCII value;
2. profile remains equal to `expectedProfile`;
3. every sibling identifier and byte string equals the retained source;
4. the complete GFF remains parseable and the ordinary Area name resolves to
   the target value.

## Required TDD and completion gates

Required tests cover:

1. exact one-entry and multi-entry admission;
2. ordered sibling preservation, empty sibling text, and uint32 identifiers;
3. duplicate identifier, missing/duplicate identifier `0`, TLK-backed,
   non-ASCII, malformed, and all budget rejections;
4. backward-compatible simple-pair validation and required profile CAS for a
   multi-entry source;
5. parser, writer, candidate readback, projector, HTTP schema, mapper, facade,
   clone/apply/undo, and dialog state;
6. focused unit, integration, round-trip, regression, and production builds.

Browser Save/reopen, Toolset Save/Build/reopen, and NWN localized display
remain release blockers. This audit admits implementation; it does not claim
native certification or complete TLK/multilingual authoring parity.

## Implementation checkpoint

The bounded profile is implemented across the production read/write path:

- backend classification emits immutable `nameProfile` provenance and includes
  it in processing dependency identity;
- the update schema/projector carries profile-bound CAS, and the GFF writer
  reparses the retained value before replacing only identifier `0`;
- candidate validation independently compares the source and candidate sibling
  identifiers/order/text, while transactional persisted readback verifies the
  requested default value/profile and exact candidate resource hash;
- the HTTP boundary, scene mapper, workspace-draft parser, properties facade,
  history-bearing scene mutation, export adapter, and dialog preserve the
  profile without making sibling values client-authoritative;
- the atomic integration gate proves byte-identical GIT/GIC/IFO companions and
  ordered alternate entries before and after publication.

Accepted offline gates on 2026-08-25 are 744/744 focused backend unit
assertions, 27/27 Area-update integration assertions, 232/232 focused frontend
unit/component assertions, 1/1 focused regression-smoke assertion, and passing
backend/frontend production builds. Runtime services, browser capture,
Toolset, and NWN were not started because the coordinated VFX task owned that
lane. Consequently the audit status remains source-closed and implemented but
release-blocked by fresh runtime/native proof.
