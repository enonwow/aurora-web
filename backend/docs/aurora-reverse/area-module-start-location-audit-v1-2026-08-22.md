# Area module start-location audit v1

Date: 2026-08-22  
Status: Offline current- and cross-Area authoring implemented; native surface
and runtime certification pending

## Scope

This audit admits a preserve-first update of the native module entry tuple while
an existing Area draft is materialized. It closes the serialized storage,
engine read/write, and compare-and-set boundary. It does **not** infer that an
arbitrary coordinate is walkable, that Toolset Save validates that coordinate,
or that NWN can traverse away from it.

No xoreos source was read or used for this audit.

## Frozen primary evidence

| Artifact | SHA-256 |
| --- | --- |
| `C:\Projects\New Folder\export\decompiled_all.c` | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` |
| `C:\Projects\New Folder\export\functions.tsv` | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` |
| `C:\Projects\New Folder\export\strings.tsv` | `864AE0139451D5333307CB2BBCCCE725BBD2D2C6056AC2D5F80F9B5EA50F190F` |
| `C:\Projects\nwn-last-city\Aurora\reverse\reverse\nwtoolset_rcdata_report.json` | `3D9C5D29709BCF4AA037554781D229A2094F3D85370C44A6A5DF9A222F8D87FA` |

The installed retail `nwtoolset.exe` identity retained by the Area program is
`4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.

## Decompiled engine findings

1. `FUN_005b5bc4` at decompiled lines 262383-262397 loads the following root
   IFO fields into one module-state tuple:
   `Mod_Entry_Area`, `Mod_Entry_X`, `Mod_Entry_Y`, `Mod_Entry_Z`,
   `Mod_Entry_Dir_X`, and `Mod_Entry_Dir_Y`.
2. `FUN_005bb574` at lines 264310-264317 writes the same six fields from the
   same module-state offsets. The five numeric fields use the native GFF Float
   reader/writer path; the Area identity uses the native ResRef path.
3. `FUN_0058cab8`, `FUN_0058cb6c`, and `FUN_0058cbc4` expose the retained entry
   Area, XYZ position, and two-component direction to the engine location
   path. This is runtime-consumed module state, not editor-only metadata.
4. `FUN_0058cc48` updates the entry Area and XYZ values together, derives and
   stores both direction components, refreshes the entry-location presentation,
   and marks the module changed. The six values therefore form one logical
   authoring operation even though GFF stores six sibling fields.
5. The module constructor initializes all five numeric members to zero. The
   load and save paths do not establish a native range, unit-length rule, or
   non-zero rule for the direction pair. The application must not invent one
   and must preserve any exact finite Float values it can represent.

## Toolset surface finding

The frozen Toolset resource report contains the `sbStartLocation` control with
the hint `Paint Start Location`, plus `Show Start Location` and
`Goto Start Location` actions. This establishes a native editing and
presentation surface. It does not establish its surface-accessibility
predicate.

## Admitted v1 contract

The exact tuple is:

```text
Mod_Entry_Area  : ResRef
Mod_Entry_X     : Float
Mod_Entry_Y     : Float
Mod_Entry_Z     : Float
Mod_Entry_Dir_X : Float
Mod_Entry_Dir_Y : Float
```

An editable source requires exactly one case-sensitive root field of each exact
type, a canonical lowercase Area ResRef that occurs exactly once in
`Mod_Area_list`, and five finite Float values. Wrong case, absence, duplicates,
wrong type, a non-member Area, NaN, or infinity is preserve-only and never
implies a default.

One update carries the entire expected tuple and entire target tuple. The
backend reparses the retained IFO under the existing module fencing lease,
requires exact source equality, and replaces only these six existing fields.
V1 does not materialize missing fields. The Area editor may target only the
Area currently being materialized; this is a deliberate product-safety policy
that avoids editing coordinates in an unseen Area. All five target numbers
must round to finite IEEE-754 binary32 values, and the stored/read-back target
is the corresponding `float32` value.

The module head revision, retained `module.ifo` hash, and draft
`sourceIfoSha256` provenance remain the immutable source binding. Candidate
validation independently parses the retained and candidate six-field tuples.
Post-publication readback then requires the exact validated candidate IFO bytes
and hash, proving that the parsed candidate—not another reconstruction—was
published. ARE, GIT, GIC, Area membership, HAK order, and every unrelated IFO
field remain preserve-first.

## Additive cross-Area authoring profile

The 2026-08-24 product profile removes the UI-only current-Area restriction
without changing the native tuple or claiming new Aurora behavior. Area detail
may expose `moduleStartLocationTargets`, a sorted immutable list of at most
4096 canonical lowercase ResRefs. A target is admitted only when a matching
ARE source is present in the same canonical snapshot and that ResRef occurs
exactly once in the retained IFO `Mod_Area_list`. Duplicate, malformed,
non-canonical, source-less, or ambiguous memberships are not offered.

The list is a bounded selector catalog, not editable state. When it is absent,
older clients and drafts retain the current-Area-only rule. When it is present,
a changed complete tuple may target any listed Area. The user must still enter
all five numeric values explicitly; switching the selected Area never derives,
copies, resets, or certifies its position or direction. Draft projection checks
the immutable source catalog, and the IFO writer independently rechecks exact
membership under the fencing lease before publication. The second check is
authoritative if the module changed after the detail was read.

This is a contract and safety-policy expansion backed by the already proven
`Mod_Area_list` membership boundary. It does not need another decompilation
claim and does not weaken the explicit unproved walkmesh and runtime boundary
below.

## Offline implementation checkpoint

Capability catalog revision `2026-08-24.28` removes
`cross_area_start_location_authoring_not_implemented`. The repository derives
the selector from canonical ARE sources that have exactly one membership in
the retained IFO, the API and scene mapper preserve a bounded immutable copy,
and the Area facade/UI allow selecting another admitted Area while retaining
the complete explicit coordinate and direction tuple. Draft projection rejects
malformed, unsorted, duplicate, non-canonical, current-Area-missing, and
unlisted catalogs. The candidate compiler and IFO writer independently recheck
the source tuple and target membership before producing one atomic successor.

Resource-bounded verification passes 546/546 backend tests across repository
projection, cache identity, service mapping, draft projection, compiler, and
writer; 217/217 frontend tests across domain, HTTP, scene, workspace, facade,
and dialog boundaries; 25/25 atomic Area-update integration scenarios; and both
production builds. No service, browser, capture, Toolset, or NWN process was
started for this checkpoint.

The capability remains `verified/partial/blocked` only on fresh browser
readback, native Toolset Save/Build/runtime, and NWN spawn/walkmesh proof. The
offline selector and persisted IFO result do not close those gates.

## Explicitly unproved boundary

This audit does not prove:

- that XYZ lies on an accessible WOK triangle;
- that Toolset Paint Start Location accepts or rejects the same surface set as
  NWN spawning;
- player spawn height adjustment, collision recovery, party spawning, or
  orientation presentation in NWN;
- Toolset Save/Build/reopen or NWN runtime behavior for the exact candidate.

Those facts require a fresh candidate-bound native experiment. Until it
passes, storage CRUD can be implemented and independently read back, but the
capability remains release-blocked and must not be described as verified entry
behavior or traversability.

## Relationship to earlier research

This freezes and extends
`aurora-toolset-entry-surface-research-2026-07-19.md`. Its open geometry
question remains open. The new result is narrower and actionable: the native
six-field IFO tuple and its atomic engine mutation path are now closed for
strict application authoring, while surface and runtime certification remain
separate gates.
