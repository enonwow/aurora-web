# Existing Area comments audit v1

Date: 2026-08-21  
Status: source-closed implementation contract; native recertification pending

## Scope and authority

This audit covers only the editor `Comments` text in the root ARE struct of
one retained Area. It does not admit changing the Area name, tag, scripts,
environment, topology, GIT/GIC object state, or module registration.

Primary decompilation authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
Its function and string indexes have SHA-256
`394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`
and
`864ae0139451d5333307cb2bbccce725bbd2d2c6056ac2d5f80f9b5ea50f190f`.
The export is locally immutable but has no manifest binding it to an exact
input executable or Ghidra configuration; the result is therefore primary
field-semantic evidence, not sole proof of the Toolset UI route. No xoreos or
other GPL source was inspected or used.

## Recovered native lineage

The confirmed Area reader `FUN_005a7fc8` reads the root `Comments` field at
approximately export line 255079 through `FUN_00aef090` into the Area member
at offset `0x9c`. The same reader also consumes `Width`, `Height`, `Tileset`,
and `Tile_List`, closing the resource-family identity.

`FUN_00aef090` accepts only GFF type `10`, the native `CExoString` field type.
When the field is missing or has a different type, it returns its supplied
default and reports the read as unsuccessful. This establishes that absence
and wrong type must not be treated as editable provenance.

The symmetric Area writer `FUN_005a9f30` writes the member at offset `0x9c`
to root `Comments` through `FUN_00af0084` at approximately line 255861. The
wrapper creates or selects a type-`10` field and stores the exact string
length and bytes. The same writer emits `ResRef`, `Width`, `Height`, `Tileset`,
and `Tile_List`, closing the write-side Area identity.

This evidence confirms the exact native label, field type, and reader/writer
pair. It does not establish a Toolset maximum length, newline normalization,
or whether every historical ARE profile physically contains the field.

## Frozen cross-boundary contract

An Area detail may expose `comments` only when the retained root ARE contains
exactly one case-sensitive `Comments : CExoString`. Empty string is valid and
remains distinct from an absent or malformed field. The frontend retains the
value unchanged as immutable source provenance and a separate editable target.

The admitted product value is a string of `0..4096` ECMAScript code units with
no NUL (`U+0000`). It is not trimmed, normalized, case-folded, or silently
truncated. The 4096-unit boundary is an Area Update v1 transport and UI budget,
not an inferred Aurora limit.

The optional changed mutation has one complete compare-and-set pair:

```json
{
  "comments": {
    "expectedValue": "Original editor note",
    "value": "Updated editor note"
  }
}
```

An absent editable target preserves the source for backward compatibility.
Only a changed complete pair is projected. A target with no valid immutable
source, a partial pair, invalid string, or unchanged pair fails closed or is
omitted according to its boundary role; it never materializes a field.

The ARE writer reparses the retained source and requires exactly one exact
`Comments` label of type `CExoString`, verifies `expectedValue`, replaces only
that field value, and preserves every other ARE field in order. GIT, GIC, and
IFO remain byte-identical to their candidate inputs. Candidate validation
independently reparses the result and requires the requested exact value.

Missing, duplicate, wrong-case, wrong-type, stale, partial, over-budget,
NUL-containing, unchanged, or readback-drifting mutations fail closed. No
missing `Comments` field is synthesized in v1.

## Completion boundary

Offline completion requires parser/repository provenance, additive HTTP and
scene transport, a frontend application facade and Area Properties surface,
projector/writer/compiler negative and round-trip tests, persisted candidate
readback, Area Update integration, focused regression tests, and production
builds. Fresh Toolset Save/Build/reopen remains mandatory. Area comments make
no NWN runtime behavior claim.
