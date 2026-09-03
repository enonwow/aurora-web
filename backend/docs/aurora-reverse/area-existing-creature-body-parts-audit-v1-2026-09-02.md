# Existing Area Creature body-part mutation audit v1

Date: 2026-09-02  
Scope: retained part-based Creature head and body-part compatibility fields on
one type-`4` Area GIT placement.  
Status: source-closed implementation verified offline; browser, Toolset, NWN,
and model-availability certification remain open.

## Decision

Aurora Web may expose one independently presence-sensitive compare-and-swap
member for each exact retained head/body slot listed below. Native storage is a
compatibility pair: the legacy case-sensitive label is a `BYTE`, while its
`x`-prefixed label is a `WORD`. The `WORD`, when present exactly once, is the
authoritative value; otherwise one exact legacy `BYTE` is the fallback. Both
absent means absent storage. Duplicated, aliased, wrong-case, wrong-type,
non-canonical paired, or otherwise malformed storage is preserve-only.

| Contract key | Legacy `BYTE` label | Wide `WORD` label |
| --- | --- | --- |
| `rightFoot` | `ArmorPart_RFoot` | `xArmorPart_RFoot` |
| `leftFoot` | `BodyPart_LFoot` | `xBodyPart_LFoot` |
| `rightShin` | `BodyPart_RShin` | `xBodyPart_RShin` |
| `leftShin` | `BodyPart_LShin` | `xBodyPart_LShin` |
| `leftThigh` | `BodyPart_LThigh` | `xBodyPart_LThigh` |
| `rightThigh` | `BodyPart_RThigh` | `xBodyPart_RThigh` |
| `pelvis` | `BodyPart_Pelvis` | `xBodyPart_Pelvis` |
| `torso` | `BodyPart_Torso` | `xBodyPart_Torso` |
| `belt` | `BodyPart_Belt` | `xBodyPart_Belt` |
| `neck` | `BodyPart_Neck` | `xBodyPart_Neck` |
| `rightForearm` | `BodyPart_RFArm` | `xBodyPart_RFArm` |
| `leftForearm` | `BodyPart_LFArm` | `xBodyPart_LFArm` |
| `rightBicep` | `BodyPart_RBicep` | `xBodyPart_RBicep` |
| `leftBicep` | `BodyPart_LBicep` | `xBodyPart_LBicep` |
| `rightShoulder` | `BodyPart_RShoul` | `xBodyPart_RShoul` |
| `leftShoulder` | `BodyPart_LShoul` | `xBodyPart_LShoul` |
| `rightHand` | `BodyPart_RHand` | `xBodyPart_RHand` |
| `leftHand` | `BodyPart_LHand` | `xBodyPart_LHand` |
| `head` | `Appearance_Head` | `xAppearance_Head` |

The canonical paired form follows Aurora's writer: the wide value is
`0..65535`; the legacy byte equals that value when it is at most `255`, and is
`0` otherwise. A byte-only source admits targets `0..255`; a word-only or
canonical paired source admits `0..65535`. Mutation replaces only fields that
already exist and never synthesizes or removes either compatibility member.

This contract does not include `BodyPart_Robe`, because the common Creature
reader/writer does not own that label. A complete negative search of the
common Creature reader/writer range found no `BodyPart_Robe`,
`ArmorPart_Robe`, or equivalent robe member. The pinned Toolset instead owns
exact `ArmorPart_Robe` on the equipped base-item-type-`3` armor Item path:
`FUN_00604db8` reads it with the compatibility helper at
`decompiled_all.c:300230`, while `FUN_00605b0c` / `FUN_00605b12` writes it at
lines `300390` and `300523`. Exact `BodyPart_Robe` is absent from the frozen
Toolset string index; exact `ArmorPart_Robe` is present. Robe authoring is
therefore an equipped-armor Item contract, not a missing direct Creature
field. The loose frontend `bodyPartRobe` metadata remains preserve-only and
must not be projected into a Creature mutation.

This contract also excludes `Phenotype`, colors,
`Wings_New`, `Tail_New`, Appearance selection, Gender, Race, equipment, PLT
material behavior, or model-resource selection. Those are independent
contracts.

## Immutable primary source record

| Source | Size | SHA-256 |
| --- | ---: | --- |
| `C:\Projects\New Folder\export\decompiled_all.c` | 30,366,020 | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe` | 12,201,984 | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| `C:\Projects\nwn-last-city\Aurora\reverse\runs\NWTOOLSET_RCDATA_REFRESH_2026-05-20.json` | 495,547 | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used. No Docker command,
service, watcher, browser/Chrome, capture, Toolset, NWN, mutation test, or
sub-agent was started.

## Aurora decompilation findings

The common Creature reader `FUN_00532174` enters the part-based storage branch
at `decompiled_all.c:194498`. Lines `194499-194536` read the exact 18 body
labels plus `Appearance_Head`, in the same order as the table above. Every
member uses helper `FUN_00af0fb4`.

`FUN_00af0fb4` at lines `969660-969673` first reads the compatibility `WORD`
member and falls back to the supplied legacy `BYTE` label only when the word
member is absent. The reciprocal helper `FUN_00af1018` at lines
`969678-969691` converts values above `255` to legacy byte `0`, writes the
legacy byte, and writes the complete `WORD`. Existing immutable native Item
evidence independently identifies this helper's at-most-16-character wide
label as the exact `x`-prefixed legacy label. Every label in the Creature table
remains within that bound.

The common Creature writer `FUN_0053521c` calls this reciprocal helper for the
same labels and order at lines `195175-195211`. The placed type-`4` wrappers
`FUN_0053ab24` / `FUN_0053ae80` delegate their GIT payload to the common
Creature lineage. The paired GIC record does not own these fields.

The frozen 52,662-byte `TDLGCREATUREEDIT` form contains the head/body change
handlers separately from color, wings, and tail controls. This confirms editor
surface ownership without turning a UI label into model-resource authority.

## Frozen additive contract

`AreaApiObjectPlacement.creatureBodyParts` contains all 19 exact keys. Each
member is `{present:false}` or a present canonical storage object containing
the effective value and exact `legacyByte` / `wideWord` presence records. At
least one native member must be present. A paired member is admitted only when
its two stored values satisfy the native compatibility rule above.

Frontend scene source state is a detached deep copy. Existing retained fields
materialize into `appearanceSettings`; belt and shoulders use the existing
`sourceOnlyParts` target bucket, while `BodyPart_Robe` stays read-only. A member
is `ACTIVE_NOW` only for one exact retained Creature ordinal and valid source
storage. New/seed Creature draft behavior remains separate. Canonical target
text is unsigned decimal with no sign, whitespace, exponent, fraction, or
leading zeroes.

`propertyMutations[].bodyParts` is a non-empty subset of the 19 keys. Each
member is exactly `{expectedValue,value}`. Planning reparses the retained
ordinal, compares the authoritative effective value and exact canonical source
shape, then forwards a frozen mutation. The writer replaces every existing
compatibility member for a changed slot, applies Aurora's byte-clamp rule, and
preserves every absent and unrequested field. Candidate and persisted readback
compare the complete requested target and exact retained storage shape.

No endpoint, binary body, pagination, streaming, or chunking is added. The
group stays inside existing Area Update property/request/object budgets and
reuses authorization, permission, idempotency, optimistic concurrency,
revision fencing, journal, recovery, and atomic ARE/GIT/GIC/IFO publication.

Routine diagnostics may expose only contract revision, Creature family,
bounded ordinal, approved slot token, changed-member count, stage, duration,
and stable result code. Part IDs, model names/ResRefs, object IDs, hashes,
paths, source/storage keys, raw fields/bytes, credentials, and host paths are
not diagnostic payload.

## Offline implementation and verification

The backend domain grammar, strict GFF parser, detached snapshot/cache state,
draft projector, immutable-ordinal planner, exact compatibility-field writer,
candidate readback, and revision-fenced transactional publication path now
carry this contract. The candidate test proves three distinct physical shapes:
a byte-only member remains byte-only, a canonical byte-plus-word member keeps
both fields and applies the native byte clamp for a target above `255`, and a
word-only member remains word-only. Unrequested and absent members are not
synthesized; paired GIC stays byte-identical.

The frontend HTTP boundary, scene mapper, saved-draft validator, history clone,
provenance reducer/materializer, Workspace Apply path, and Creature properties
dialog carry detached exact storage. Per-member source capacity controls the
numeric maximum. `BodyPart_Robe`, wings, and tail remain visible but disabled
for retained objects under their independent preserve-only boundary.

Sequential one-worker verification passes all `1660/1660` assertions across
the seven affected backend suites and all `1201/1201` assertions across the
seven affected frontend suites. The capability catalog passes `14/14` at
revision `2026-09-02.167`, and both production builds pass. During the full
parser run, two stale Item round-trip expectations were corrected against the
already source-closed Item property-matrix audit: root `PaletteID`, root
`CostTable`/`CostValue`, Item scripts, and GIT `Comment` are now explicitly
asserted not to be synthesized.

## Completion boundary

This audit claims offline implementation only. Fresh guarded browser
Save/reopen with settled part-model renderer diagnostics, exact-candidate
Toolset Save/Build/reopen and packed compatibility-field readback, and NWN
visual behavior remain independent release gates. They were not attempted in
this checkpoint.

## Creature robe ownership correction checkpoint

The implementation boundary now matches the negative primary-source finding
above. `POST /catalog/creatures/blueprints` explicitly rejects
`blueprint.bodyPartRobe`; the UTC serializer type and writer no longer expose
or emit `BodyPart_Robe`; generic UTC parsing and placed type-`4` Area Creature
metadata extraction do not promote a rogue `BodyPart_Robe` or
`ArmorPart_Robe`; and the frontend Creature creation wizard filters both loose
legacy source metadata and `sourceOnlyParts.robe` from its authoring payload.
The read-only frontend compatibility mapping remains available to render or
display legacy loose metadata without granting mutation authority.

The Item boundary is unchanged: UTI and embedded equipped-Item parsing and
writing continue to own native `ArmorPart_Robe`. Red-green verification
records the previously accepted Creature paths failing before the correction.
After implementation, the schema suite passes `36/36`, the Area parser passes
`344/344`, the full template parser passes `27/27`, the Creature creation
wizard passes `6/6`, capability accounting passes `14/14` at revision
`2026-09-02.170`, and both production builds pass. The full template-parser
run also corrected one stale Store expectation to the already contracted
native bucket order `[0,4,2,3,1]`; no Store behavior was changed by this
checkpoint.

These source writes make runtime profile v24 historical. Immutable replacement
profile v25, built at `2026-09-02T13:03:29.094Z`, binds 1,819 runtime files and
30,892,451 bytes to digest
`f53b0eed54c1ceae097b8917ca54a40bb8c35cb07b45b6bc8927e8b295436f37`.
Profile SHA-256 is
`454e1d037815fed75659c02463027b3db0e6211ad66869bc63abc06a0ad594bc`,
source-manifest SHA-256 is
`d08be595354a3aae73de1d58146866d221b5ef35b6fe7202a88b41994b761451`,
and binding SHA-256 is
`803ef54e6b2e1fe4b4b218b67eb3e2492c223f71b0da8cec7e3ad983f86528c9`.
Replacement plan
`0aae944e863e27ef5b797d9ab6364d34ea92a5364e2ccf836c106bc4a445e6ac`
explicitly replaces v24 plan
`a66be72840096a8db000e954b7856c8fc0d78d1519ab424923ef0383787ae978`,
validates `ready` with verified runtime-source identity, and remains exactly
`0/3380`. It contains 99 tilesets and 53,700 rows: 45,031 Add/Render rows,
44,692 applicable connection rows, 9,100 group rows, 8,669 named-blocked rows,
and 9,008 total blocked rows. PathConnect acceptance is still zero. No Docker
command, service, browser, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used.
