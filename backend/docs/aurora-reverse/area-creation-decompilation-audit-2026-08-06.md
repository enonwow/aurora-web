# Area creation decompilation audit - 2026-08-06

## Executive verdict

**Aurora-first verdict: HOLD for canonical Area-creation semantics.**

The current primary export materially improves confidence in the ARE runtime
layout. A reader function consumes `Tileset`, `Tile_List`, every tile identity
and transform field, and all seven light/animation bytes. A writer function
emits the broad Area field set, calculates `Width * Height`, visits each grid
slot, and serializes the same per-tile fields for non-null cells. These are
valuable confirmed anchors for preserving an existing ARE and for enforcing a
complete grid.

They do not prove the retail Toolset's New Area wizard, its initialization
defaults, its tile-selection/orientation algorithm, GIT/GIC initialization, or
the acceptance of Aurora Web's minimal writer. The export has no manifest that
binds it to an exact input binary and Ghidra configuration, and searches do not
locate a `New Area`/`Area Wizard` UI route in it. The repository's strict Area
parser HOLD and the native PathConnect gap also remain open.

The strongest native creation evidence is therefore still the live
AUR-S05-05 Toolset packet, not the decompilation. The web implementation must
use a declared project policy or preserve known native fields for every
unrecovered semantic; it must not label guessed defaults as Aurora parity.

## Audit identity and evidence rules

- Repository: `C:\Projects\aurora-web`
- Branch: `codex/tile-matrix-resume-20260729`
- HEAD: `348e8ff0e27677b7c611c56afa4d706685b393f0`
- Audit date: 2026-08-06
- Predecessor tasks reviewed:
  - `codex://threads/019f7c89-2412-7fa3-89fc-f309e3804842`
  - `codex://threads/019fae15-2213-73c3-ac4c-ee6ad70de021`
- Related broad evidence audit:
  `backend/docs/aurora-reverse/aurora-decompilation-audit-2026-08-06.md`
- xoreos use in this audit: **none**. Existing xoreos-backed documents are
  identified only as quarantined evidence-policy defects.
- No new decompilation, Toolset input, NWN execution, or capture was performed.

Classifications:

- **confirmed primary**: observed directly in the hash-identified local export;
- **verified native**: passed an accepted Toolset proof gate with packed
  readback;
- **confirmed repository**: observed directly in current source, tests, or
  immutable manifests;
- **inference**: consistent with evidence but not directly proven;
- **missing**: the necessary primary or native evidence is absent.

## Primary export identity

Files re-hashed during this audit:

| Evidence | Bytes | SHA-256 | Status |
| --- | ---: | --- | --- |
| `C:\Projects\New Folder\export\decompiled_all.c` | 30,366,020 | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` | confirmed local export |
| `C:\Projects\New Folder\export\functions.tsv` | 1,928,975 | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` | confirmed local index |
| `C:\Projects\New Folder\export\strings.tsv` | 2,691,636 | `864AE0139451D5333307CB2BBCCCE725BBD2D2C6056AC2D5F80F9B5EA50F190F` | confirmed local index |

The installed binaries were already re-hashed by the broad audit, including:

- `bin\win32\nwtoolset.exe`:
  `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`;
- `bin\win32\nwmain.exe`:
  `3B7CB40B09B62E076581CE69D264D4184E1B48B50AFD911470651A9122D1484F`.

No export manifest states which exact binary produced the export. The hashes
must not be treated as a provenance binding merely because the files coexist
on this workstation.

## Confirmed ARE anchors

### Reader anchor: `FUN_005a7fc8`

Status: **confirmed primary** at approximately line 254782 of the export.

The function reads the Area resource fields and, around line 255345, resolves
`Tile_List`. For each list element it reads:

- `Tile_ID`;
- `Tile_Orientation`;
- `Tile_Height`;
- `Tile_MainLight1` and `Tile_MainLight2`;
- `Tile_SrcLight1` and `Tile_SrcLight2`;
- `Tile_AnimLoop1`, `Tile_AnimLoop2`, and `Tile_AnimLoop3`.

This confirms the runtime field vocabulary and that the seven byte fields are
independent serialized state. It does not reveal the Toolset wizard's default
values for those fields.

### Writer anchor: `FUN_005a9f30`

Status: **confirmed primary** at approximately line 255702 of the export.

The function emits the broad Area field set, writes `Width`, `Height`, scripts,
lighting/weather state, `Tileset`, and starts `Tile_List`. It computes:

`tileSlots = Width * Height`

It then visits each grid pointer. A tile struct is written only when the
pointer is non-null, and the struct contains the three dword tile fields plus
all seven byte fields.

Consequences supported by this anchor:

1. a canonical writer owns substantially more root state than the six-field
   new-Area writer in Aurora Web;
2. complete grid cardinality is a necessary safety invariant for reliable
   serialization;
3. null internal grid cells can lead to fewer serialized tile structs than
   `Width * Height`.

Point 3 is consistent with the verified AUR-S05-06 expansion failure, where a
2x2 to 4x4 resize retained four records and left 12 null cells. It is an
inference across two evidence sources, not a claim that this unbound export is
the exact Toolset routine that caused the observed access violation.

## Native creation evidence versus decompilation

| Question | Decompilation | Native AUR-S05-05 | Current status |
| --- | --- | --- | --- |
| ARE field vocabulary | broad reader/writer anchors | packed 53-label artifact | verified for the sample |
| Grid serialization | writer visits `Width * Height`, skips null pointers | 2x2 produced four records | verified for complete 2x2; sparse unsafe |
| Tile byte vocabulary | seven independent bytes | lights 0, anim loops 1 | verified for MicroSet/Tiny |
| Initial tile IDs/orientations | not recovered as wizard logic | tile 12, orientations 2/1/3/0 | one native sample only |
| Name/ResRef/Tag policy | not recovered | `Area 001` / `area002` / `Area001` | one native sample only |
| GIT defaults | not recovered here | 19 fields with sound/music defaults | one native sample only |
| GIC defaults | not recovered here | 9 fields | meanings/profile still missing |
| IFO Area registration | vocabulary exists elsewhere; wizard route not recovered | fourth entry verified | native sample verified |
| App candidate accepted by Toolset/NWN | not answered | not tested | missing |

The absence of `New Area` and `Area Wizard` matches in the export, together
with missing export provenance, means the UI creation route cannot be claimed
as recovered. String absence alone is not proof that the routine is absent;
the correct conclusion is that this export does not currently locate it.

## Findings

### AREA-REV-P0-01 - the primary export has no reproducible lineage

Status: **missing**.

There is no machine-readable manifest binding the export to:

- the exact input executable and SHA-256;
- PE identity and image base;
- Ghidra version;
- project/language/compiler selection;
- analyzer settings and timeouts;
- import scripts and their hashes;
- symbol/function/strings export commands;
- output file hashes and generation time.

Impact: the function anchors can be rechecked in a stable local file, but a
third party cannot regenerate them or establish whether they came from
`nwmain.exe`, `nwtoolset.exe`, or another admitted binary. This blocks using
the export as sole canonical authority for Toolset Area creation.

### AREA-REV-P1-02 - New Area wizard initialization is not recovered

Status: **missing**.

The current export does not close these semantics:

- tileset and size list construction;
- blank terrain/tile selection for arbitrary dimensions;
- initial orientation/randomization order and seed ownership;
- exact ResRef, localized name, and tag generation;
- the default 43-field ARE profile;
- the 19-field GIT and 9-field GIC initialization profiles;
- registration order and Save/Build normalization.

Current app defaults in those areas are therefore project policies or guesses,
not decompiled Aurora behavior.

### AREA-REV-P1-03 - the app writer conflicts with both the primary writer shape and native sample

Status: **failed**.

The primary writer anchor emits the broad Area state, while Aurora Web emits
six new root fields. The native sample further demonstrates concrete defaults
that the app does not reproduce: `ResRef` and other required root state,
animation-loop bytes of one, canonical GIT `List`, sound/music fields, and a
nine-field GIC.

The mismatch cannot be closed by the fact that the app parser can reopen its
own output. It requires a native profile and independent consumer proof.

### AREA-REV-P1-04 - the strict ARE/GIT reverse HOLD remains open

Status: **missing**.

`backend/docs/aurora-reverse/reverse-final-gaps-sanity-check-r83.md` keeps the
strict Area parser behind unresolved P0 items:

- MH-01, MH-02, MH-08: canonical GIT/ARE call chains;
- MH-03: alias/duplicate policy;
- MH-05, MH-07: canonical GIT list path and bounds/overflow behavior.

The reader and writer anchors in this report do not close the full call-chain,
duplicate, alias, or malformed-input contracts. Until those items have exact
binary-bound evidence, unknown fields must be preserved and strict behavior
must remain fail-closed.

### AREA-REV-P1-05 - a legacy Area composition document violates the current xoreos boundary

Status: **failed evidence policy**.

`backend/docs/aurora-reverse/area-composition-spec-r63.md` states that an
`xoreos-nwn`/`xoreos-nwn2` runtime profile controls the interpretation of
runtime-consumed versus preserve-only lanes. Under the current mandatory GPL
secondary-reference policy, xoreos may be used only as a format/naming
reference and cannot be Aurora runtime authority.

No xoreos material was found in the production Area source reviewed here, and
none was consulted for this audit. The legacy document must be quarantined or
rewritten before any of its runtime conclusions are used to justify Area
creation behavior.

### AREA-REV-P1-06 - PathNode work does not prove PathConnect or Area traversability

Status: **missing**.

The two predecessor tasks correctly kept the 50-symbol documented PathNode
corpus separate from native PathConnect. Current matrix state remains:

- PathNode reference evaluated for 43,653 of 52,767 candidate rows;
- native PathConnect accepted for 0 of 52,767 rows;
- add/render accepted for 618 of 53,136 rows.

The local export contains PathNode vocabulary, but the task has not recovered
or differentially proven the exact edge-connectivity algorithm. A visually
plausible Area cannot therefore be labelled connected or traversable on this
evidence.

This gap need not block a narrowly stated structural 2x2 creation experiment.
It must block broad tileset-connectivity and playability claims.

### AREA-REV-P2-07 - the predecessor tasks advanced local evidence but did not close Area creation

Status: **verified limitation**.

Task #3 established local CUD packets and the first path-node-aware matrix.
Task #4 hardened plan binding, advanced 87 packets, recovered an exact MTR
diffuse family, and stopped without falsely advancing the checkpoint. These
are useful renderer and evidence-control improvements.

Neither task produced:

- a Toolset-wizard decompilation call chain;
- a native PathConnect profile;
- a complete 99-tileset add/render matrix;
- or a native acceptance packet for Aurora Web's ARE/GIT/GIC writer.

The tasks' local/non-parity labels were generally correct. Their artifacts are
inputs to the Area-creation program, not closure of it.

## Recovered facts safe to implement now

The following narrow contracts have adequate support:

1. `Tile_List.length == Width * Height` is a mandatory fail-closed invariant
   for an Area presented as complete.
2. Existing ARE fields outside the editable topology lane should be preserved,
   not synthesized or discarded.
3. Each non-empty tile struct owns `Tile_ID`, orientation, height, four light
   bytes, and three animation-loop bytes.
4. Tile orientation is a discrete grid/tile property and must not be conflated
   with GIT object bearing or visual-only transform data.
5. The AUR-S05-05 `MicroSet/Tiny` artifact may be used as an exact immutable
   golden sample for that profile only.
6. Retail expanding resize is not an accepted native authoring route; create at
   final dimensions and refuse every sparse grid.

## Semantics that must remain preserve-only or explicitly project-defined

- arbitrary-size blank tile selection and orientation;
- animation-loop defaults outside the exact native sample;
- localized name, ResRef, and tag generation;
- lighting, weather, rest, PvP, scripts, and expansion defaults;
- GIT ambient/music initialization outside the exact sample;
- all nine GIC fields until decoded and classified;
- group reconstruction and auto-retile behavior beyond local tests;
- native PathConnect and traversability;
- Toolset normalization during Save/Build;
- NWN runtime acceptance.

## Required reverse-work plan

1. Produce a new immutable Ghidra export manifest for the exact admitted
   `nwtoolset.exe`; if runtime parsing is also needed, create a separate
   manifest for `nwmain.exe` rather than combining authority.
2. Locate `TdlgAreaWizard`, command 133, its page transitions, and the final
   creation call chain in the Toolset binary. Bind every recovered function to
   exact addresses and xrefs.
3. Trace construction of ARE, GIT, GIC and IFO Area entries from the Finish
   action through Save/Build. Record default ownership and branch conditions;
   do not infer defaults from string presence.
4. Generate isolated native samples for at least two tilesets and multiple
   sizes. Hash and structurally diff all four affected resources.
5. Close the open MH parser/bounds items or explicitly keep the corresponding
   behavior preserve-only.
6. Build an app candidate from the recovered versioned profile and run the
   exact native open/Save/Build/packed-readback/NWN route.
7. Recover or differentially prove PathConnect separately. Keep the documented
   PathNode resolver reference-only until that proof exists.
8. Remove or quarantine xoreos-authoritative Area conclusions and add a policy
   gate preventing them from becoming runtime acceptance criteria.

## Closure criteria

Canonical Aurora Area creation remains on HOLD until one evidence packet binds:

1. exact Toolset binary hash and reproducible decompiler manifest;
2. wizard command/UI route and creation call chain;
3. versioned ARE/GIT/GIC/IFO default profile for the claimed tileset and size;
4. app code revision and emitted resource hashes;
5. independent strict validation;
6. Toolset open, Save, Build, and packed structural readback;
7. NWN settled runtime load;
8. explicit classifications for every unresolved semantic;
9. no xoreos-derived runtime authority;
10. proof freshness, capture provenance, and zero unexpected failed/bridge
    states under the current safety contract.

