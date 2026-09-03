# Existing Area Waypoint `LinkedTo` audit v1

Date: 2026-09-01  
Status: native storage source-closed; authoring not admitted; runtime semantics pending

## Decision

Aurora Web must preserve the exact existing `LinkedTo : CExoString` storage of
a retained type-`5` Area GIT Waypoint, but must not expose a mutation for it.
The immutable Toolset sources close field identity and reciprocal persistence;
they do not close the field's validation rules, target namespace, coupling to
doors or triggers, runtime consumer, or safe behavior when the value changes.

The field therefore remains `PRESERVE_ONLY`. Its known presence must not be
mistaken for authority to implement a generic target-reference editor, infer a
Tag relationship, create a missing field, or validate against currently loaded
Area objects. `target_reference_runtime_pending` remains a release blocker for
the wider Waypoint property matrix.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen `TDLGWAYPOINTEDIT` RCDATA | `8a228ea412ed5763283486b4211d42752fec0a335159dfe1138d3e3dc6959506` |

No xoreos or other GPL source was inspected or used.

## Native storage facts

Common Waypoint reader `FUN_00658170` reads exact case-sensitive `LinkedTo`
through the CExoString helper `FUN_00aef090` at decompiled line `346972`, with
an empty string as the missing-field default. Reciprocal common writer
`FUN_00658b4c` emits the same member through `FUN_00af0084` at line `347171`.
This closes storage identity and round-trip ownership inside the native
Waypoint record.

The exact Waypoint-specific string symbols `s_LinkedTo_00c5b9eb` and
`s_LinkedTo_00c5ba32` have no references outside those reader and writer calls
in the immutable Toolset export. Other native object families own independent
`LinkedTo` and `LinkedToFlags` members; those are not evidence that a Waypoint
value shares their runtime interpretation.

## Toolset form boundary

The frozen 3,368-byte `TDLGWAYPOINTEDIT` `TPF0` form contains label
`lLinkedTo` with caption `Linked To` and edit `eLinkedTo`. Both serialize
`Visible = false`. The edit has no serialized `MaxLength`, `OnChange`,
selection button, or target-list handler. By contrast, the adjacent active
`eTag` serializes `MaxLength = 32` and `OnChange = eTagChange`, while active
localized-name controls `eLocName` and `bLocName` are present without the
false visibility property.

The hidden controls corroborate that this retail Toolset build does not expose
an operator workflow from which Aurora Web could derive safe authoring
semantics. They do not prove the field is unused by NWN runtime.

## Missing evidence required for admission

An additive `LinkedTo` mutation remains blocked until primary evidence closes
all of the following:

1. which runtime system consumes Waypoint `LinkedTo`, if any;
2. whether the target is a Waypoint Tag, object Tag, resref, module/Area name,
   or another namespace;
3. allowed length, character, empty-value, case, uniqueness, and missing-field
   behavior;
4. coupling to another field, object family, transition record, script, or
   module table;
5. exact Toolset Save/Build/reopen and NWN behavior for changed, stale,
   missing-target, and ambiguous-target values.

Until those facts are proven, the parser/writer must preserve original bytes
through every unrelated Area mutation and the frontend must not synthesize an
editable target from display metadata.

## Resource/process statement

This audit used immutable decompilation exports and read-only installed
PE/RCDATA bytes. No Docker command, container, service, watcher, browser,
Chrome, capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used.
