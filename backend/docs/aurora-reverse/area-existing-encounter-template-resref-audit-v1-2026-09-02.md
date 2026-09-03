# Existing Area Encounter `TemplateResRef` audit v1

Date: 2026-09-02  
Status: source-closed; offline implementation verified; fresh browser,
Toolset, and NWN proof pending

## Decision

Aurora Web may replace one exact existing
`TemplateResRef : ResRef` on a retained type-`7` Area GIT Encounter. Both the
expected and target value must match `[a-z0-9_]{1,16}` and must differ.
Missing, empty, duplicated, wrong-case, wrongly typed, noncanonical, or
otherwise ambiguous storage stays visibly `PRESERVE_ONLY`; it never
authorizes field creation or normalization.

This mutation changes only the retained instance selected by immutable
Encounter family ordinal. It does not rename or rewrite a UTE, change palette
or renderer identity, copy blueprint defaults, propagate to other instances,
or claim Encounter spawn behavior. The Toolset's separate `Update instances
in current area` action remains outside this v1 contract.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` |
| installed retail `nwtoolset.exe` | `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24` |
| frozen RCDATA report | `3D9C5D29709BCF4AA037554781D229A2094F3D85370C44A6A5DF9A222F8D87FA` |
| retail `TDLGENCOUNTEREDIT` RCDATA | `291D98DC67AF0AA0E32925ECF205E9DBE2AABADFFFB43B0F9941DEF9308D96EE` |

The RCDATA is the 9,574-byte `TPF0` form at RVA `0x00AF8314`. No
xoreos or other GPL source was inspected or used.

## Native storage closure

Common Encounter reader `FUN_0055d470`, beginning at decompiled line
`215106`, invokes the native ResRef reader `FUN_00aeef98` with exact label
`TemplateResRef` at lines `215133-215134`. The value is stored in the common
Encounter member at `param_1 + 7`; Tag, LocalizedName, flags, counts, faction,
difficulty, scripts, variables, and CreatureList are read independently.

Reciprocal common writer `FUN_0055dbf8`, beginning at line `215380`, writes
that same member through native ResRef writer `FUN_00aeffa4` and exact
`TemplateResRef` at line `215396`. Placed writer `FUN_0055e71c` delegates this
common record before its distinct origin, Geometry, SpawnPointList, and paired
GIC Comment lanes. This closes type, label, owner, and separation from every
other retained Encounter member.

The generic ResRef reader/writer lineage identifies GFF type `0x0b`, a
one-byte length, and at most 16 data bytes. Although the native writer can
lowercase ASCII uppercase bytes, the web contract requires already canonical
lowercase ASCII and does not depend on normalization.

## Toolset control and coupling closure

Frozen `TDLGENCOUNTEREDIT` contains Advanced-tab label `lTemplate`, caption
`Template`, edit `eTemplate`, handler `eTemplateChange`, and separate button
`bUpdateInstancesInArea` with caption ` Update instances in current area`.
Read-only PE inspection locates `TdlgEncounterEdit`, VMT `0x00BCD764`, and its
28-entry method table at `0x00BCDE86`. The `eTemplateChange` entry maps to
`FUN_0049a034` at `0x0049A034`.

That handler calls the shared edit validator, reads the current Template text,
checks only length `1..16`, and changes the enabled state of the separate
update-instances button. It does not invoke Encounter serialization, spawn,
difficulty, faction, script, creature-list, challenge-rating, or other
property mutation logic. Therefore no coupled persisted field is required for
the bounded exact storage CAS.

## Frozen additive contract

Area detail may add this presence-sensitive fact to one Encounter placement:

```ts
type EncounterTemplateResRefStorage =
  | { present: false }
  | { present: true; nativeType: "resref"; value: string };
```

The frontend detaches it under immutable
`source.encounterTemplateResRef` and exposes a separate editable
`SceneObject.encounterTemplateResRef`. A changed exact target projects:

```ts
templateResRef: {
  expectedResRef: string;
  resRef: string;
};
```

Planning reparses the exact source ordinal and requires exactly one canonical
case-sensitive native field. The writer replaces only that field, preserves
its position, and performs whole-candidate plus persisted readback. The pair
may coexist with independently admitted Encounter property, list, polygon,
and editor-comment mutations in one revision-fenced ARE/GIT/GIC/IFO
transaction.

## Diagnostics and completion boundary

The low-cardinality event is `area_encounter_template_resref_cas.v1`. It may
record only contract revision, Encounter family, bounded stage, outcome,
stable result code, changed-field count, and duration. Values, object IDs,
hashes, paths, source/storage keys, raw fields or bytes, credentials, and host
paths are excluded from routine logs and metric labels.

Offline closure is verified. The implementation now includes strict
domain/parser/snapshot handling, detached HTTP and scene provenance,
saved-draft/history cloning, reducer/materializer and visible-state coverage,
exact projection/planning/writing/candidate readback, Workspace
Apply/Cancel/reopen/OK/local-Save regression, the capability-catalog revision,
and successful backend/frontend production builds.

The bounded verification run completed with 1,681/1,681 relevant backend
assertions and 1,216/1,216 relevant frontend assertions. It covers absent,
duplicate, wrong-type, noncanonical, and stale-source rejection; exact
type-`7` ordinal CAS; GIC preservation; whole-candidate readback; immutable
source cloning; renderer-`resRef` independence; and the visible Workspace
workflow. Browser readback, exact-candidate Toolset Save/Build/reopen with
packed readback, and NWN behavior remain separate release gates.

## Resource/process statement

This audit used immutable decompilation, PE, and RCDATA evidence only. The
installed Toolset was not started. No Docker command, container, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used.
