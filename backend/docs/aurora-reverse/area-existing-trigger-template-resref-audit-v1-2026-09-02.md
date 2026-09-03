# Existing Area Trigger `TemplateResRef` audit v1

Date: 2026-09-02  
Status: source-closed; offline implementation verified; fresh browser, Toolset, and
NWN proof pending

## Decision

Aurora Web may replace one exact existing `TemplateResRef : ResRef` on a
retained type-`1` Area GIT Trigger. Both the expected and target value must
match `[a-z0-9_]{1,16}` and must differ. Missing, empty, duplicated,
wrong-case, wrongly typed, noncanonical, or otherwise ambiguous storage stays
visibly `PRESERVE_ONLY`; it never authorizes field creation or normalization.

This mutation changes only the retained instance selected by immutable Trigger
family ordinal. It does not rename or rewrite a UTT, change palette or renderer
identity, copy blueprint defaults, propagate to other instances, or claim
Trigger link, trap, script, variable, transition, or runtime-activation
behavior. The Toolset's separate `Update instances in current area` action
remains outside this v1 contract.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` |
| installed retail `nwtoolset.exe` | `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24` |
| frozen RCDATA report | `3D9C5D29709BCF4AA037554781D229A2094F3D85370C44A6A5DF9A222F8D87FA` |

The RCDATA report identifies `TDLGTRIGGEREDIT` as the 13,240-byte `TPF0` form
at RVA `0x00BB62F8`. No xoreos or other GPL source was inspected or used.

## Native storage closure

Common Trigger reader `FUN_00656720`, beginning at decompiled line `345687`,
invokes native ResRef reader `FUN_00aeef98` with exact label
`TemplateResRef` at lines `345767-345768`, then stores the result in the
common Trigger member at `param_1 + 7` on line `345769`. Tag, localized name,
faction, links, trap fields, scripts, variables, and all other members are read
through separate calls.

Reciprocal common writer `FUN_0065752c`, beginning at line `346102`, selects
the same member at line `346113` and passes it through native ResRef writer
`FUN_00aeffa4` with exact `TemplateResRef` at line `346115`. Placed Trigger
writer `FUN_00657de0` delegates the common record at line `346628` before its
distinct position, orientation, Geometry, and paired-GIC Comment lanes. This
closes type, label, owner, and independence from every other retained Trigger
member.

The generic ResRef lineage identifies GFF type `0x0b`, one-byte length, and at
most 16 data bytes. Although the native writer can lowercase ASCII uppercase
bytes, the web contract requires already canonical lowercase ASCII and never
depends on writer normalization.

The installed `newgeneric.UTT` production-adapter readback and accepted native
type-`1` Trigger GIT readback independently contain exact
`TemplateResRef : ResRef = "newgeneric"`; their immutable identities remain
recorded by `area-trigger-construction-audit-v1-2026-08-13.md`.

## Toolset control and coupling boundary

Frozen `TDLGTRIGGEREDIT` contains Advanced-tab edit `eTemplateName`, caption
`Template Name`, handler `eTemplateNameChange`, and a separate
`bUpdateInstancesInArea` control with caption
` Update instances in current area`. The edit and propagation action are
therefore distinct controls. Combined with the independent common
reader/writer member above, no other persisted Trigger field is required for
the bounded exact storage compare-and-swap.

This audit deliberately does not claim the semantics of clicking the separate
update-instances control. Aurora Web does not expose that operation in this
slice and writes exactly one retained ordinal.

## Frozen additive contract

Area detail may add this presence-sensitive fact to one Trigger placement:

```ts
type TriggerTemplateResRefStorage =
  | { present: false }
  | { present: true; nativeType: "resref"; value: string };
```

The frontend detaches it under immutable `source.triggerTemplateResRef` and
exposes a separate editable `SceneObject.triggerTemplateResRef`. Generic
`SceneObject.resRef`, palette identity, display metadata, and UTT source
identity never grant mutation authority and remain unchanged.

A changed exact target projects onto the retained Trigger property mutation:

```ts
templateResRef: {
  expectedResRef: string;
  resRef: string;
};
```

Planning reparses the exact source ordinal and requires exactly one canonical
case-sensitive native field. The writer replaces only that field, preserves
its position, and performs whole-candidate plus persisted readback. The pair
may coexist with independently admitted Trigger Tag, position, polygon, and
future separately audited property mutations in one revision-fenced
ARE/GIT/GIC/IFO transaction.

## Diagnostics and completion boundary

The low-cardinality event is `area_trigger_template_resref_cas.v1`. It may
record only contract revision, Trigger family, bounded stage, outcome, stable
result code, changed-field count, and duration. Values, object IDs, hashes,
paths, source/storage keys, raw fields or bytes, credentials, and host paths
are excluded from routine logs and metric labels.

Offline closure is verified. The implementation includes strict
domain/parser/snapshot handling, detached HTTP and scene provenance,
saved-draft/history cloning, reducer/materializer and visible-state coverage,
exact projection/planning/writing/candidate readback, Workspace
Apply/Cancel/reopen/OK/local-Save regression, capability-catalog revision
`2026-09-02.174`, and successful backend/frontend production builds.

The bounded verification completed with `696/696` relevant backend assertions
and `1,223/1,223` relevant frontend assertions. It covers absent, duplicate,
wrong-type, noncanonical, and stale-source rejection; exact type-`1` ordinal
CAS; GIC preservation; whole-candidate readback; immutable source cloning;
renderer-`resRef` independence; and the visible Workspace workflow.

Fresh guarded browser readback, exact-candidate Toolset Save/Build/reopen with
packed readback, and NWN behavior remain separate release gates. This audit
does not certify full Trigger, Area, tile, PathConnect, or 99-tileset-matrix
completion.

## Resource/process statement

This audit used immutable decompilation and frozen PE/RCDATA evidence only.
The installed Toolset was not started. No Docker command, container, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used.
