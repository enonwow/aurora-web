# Existing Area Creature appearance-color mutation audit v1

Date: 2026-09-02  
Scope: exact retained `Color_Skin`, `Color_Hair`, `Color_Tattoo1`, and
`Color_Tattoo2` fields on a type-`4` Area GIT Creature placement.  
Status: `OFFLINE_SOURCE_CLOSED`; guarded browser and native release proof remain open.

## Decision

Aurora Web may replace any changed subset of the four exact existing native
appearance-color fields. Each member is independently presence-sensitive and
is admitted only as one canonical case-sensitive GFF `BYTE` with an integer
value in `0..255`. Missing, duplicated, aliased, wrong-case, wrong-type,
malformed, or stale storage is preserve-only. This lane never creates or
removes a native field.

This contract is limited to the four stored palette indices. It does not
authorize body-part, head, phenotype, race, gender, wings, tail, portrait,
equipment, PLT texture, material, or renderer changes. Those remain separate
contracts even when they influence the same visible Creature model.

## Immutable primary source record

| Source | Size | SHA-256 |
| --- | ---: | --- |
| `C:\Projects\New Folder\export\decompiled_all.c` | 30,366,020 | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe` | 12,201,984 | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| `C:\Projects\nwn-last-city\Aurora\reverse\runs\NWTOOLSET_RCDATA_REFRESH_2026-05-20.json` | 495,547 | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used. No Toolset, NWN,
browser, server, Docker process, or capture was started for this audit.

## Aurora decompilation findings

The common Creature reader `FUN_00532174` reads the four exact labels at
`decompiled_all.c:194542-194549` through `FUN_00aeed68`. The values are stored
as four adjacent bytes behind the Creature color-storage pointer at offset
`0xd0`, in this exact order:

1. `Color_Skin`
2. `Color_Hair`
3. `Color_Tattoo1`
4. `Color_Tattoo2`

The paired common Creature writer `FUN_0053521c` writes the same labels and
order at `decompiled_all.c:195212-195218` through `FUN_00aefd1c`. The reader
and writer are both conditional on the Creature's model/part color storage
being present, so a missing native field is not authority to synthesize one.

`FUN_00aeed68` accepts native GFF type id `0`, while `FUN_00aefd1c` writes the
same type. The repository's native GFF vocabulary maps type id `0` to `BYTE`.
The serializable storage bound is therefore the complete integer range
`0..255`; this is a binary storage conclusion, not a claim that every palette
index has been separately exercised through the Toolset UI.

The frozen Toolset form report identifies `TDLGCREATUREEDIT` as a 52,662-byte
`TPF0` form at RVA `0x00AE4698`. Its handler inventory contains `bColorClick`
and the adjacent head/body/wings/tail change handlers. This independently
confirms a dedicated color-control path in the native Creature editor without
equating it to the separate body-part selectors.

## Frozen additive contract

Area detail exposes one exact four-member `creatureAppearanceColors` group.
Every member is either `{present:false}` or
`{present:true,nativeType:"byte",value}`. The frontend keeps a detached copy
in `source.creatureAppearanceColors`; only an exact present member on an
`aurora_git`, `sourceKind=creature`, non-negative `sourceIndex` object is
`ACTIVE_NOW`.

The editable target is
`creatureProperties.appearanceSettings.colors.{skin,hair,tattoo1,tattoo2}`.
Targets are canonical decimal strings whose numeric values are in `0..255`.
Leading zeroes, signs, fractions, exponent notation, whitespace, empty
strings, and out-of-range values fail closed. A changed member projects as
`{expectedValue,value}`; the group must be non-empty and contain only the four
canonical keys.

Planning reparses the retained type-`4` ordinal and performs full-value CAS per
changed member. The paired writer requires one exact case-sensitive native
`BYTE` per requested label, replaces only those fields in GIT, and preserves
unrequested GIT fields plus paired GIC and module IFO bytes. Candidate and
persisted readback compare the complete requested target.

## Diagnosability and budgets

The extension adds no endpoint, binary body, pagination, chunking, streaming,
or broad payload. The complete four-member mutation stays within the existing
Area Update object/property/request limits and reuses the authorization,
permission, idempotency, revision-fence, journal, recovery, and atomic
ARE/GIT/GIC/IFO publication contract.

Routine diagnostics may expose only the contract revision, `creature` family,
bounded ordinal, one of the four approved field tokens, changed-member count,
stage, duration, and stable result code. Palette values, object IDs, hashes,
raw fields or bytes, source/storage keys, credentials, and host paths are not
diagnostic payload.

## Offline implementation checkpoint

The source-closed contract is wired through the backend parser, detached
snapshot/cache projection, draft projector, exact-ordinal CAS planner,
field-only paired GFF writer, candidate compiler, and readback. Frontend HTTP,
scene, persisted workspace-draft, history clone, dialog control, reducer, and
Apply materialization boundaries preserve exact provenance and gate each color
independently. Retained absent members remain visible but `PRESERVE_ONLY`; new
Creature drafts keep bounded authoring without inventing retained provenance.

Focused parser, domain, projector, planner, writer, candidate-compiler, HTTP,
scene mapper, workspace boundary, clone, provenance, and dialog tests pass,
and both production builds pass. Broader relevant-suite results are recorded
in the Area program checkpoint rather than promoted here as native proof.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GIT readback, and NWN visible/runtime inspection remain mandatory
release gates. This audit does not claim those gates or full Creature
appearance/body-part completion.
