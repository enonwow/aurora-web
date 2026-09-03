# Area sound construction audit v1

Date: 2026-08-13  
Status: verified implementation authority for the exact base-UTS profile below  
Scope: construct a new `SoundList`/GIC pair from the immutable
`animalcriesday.uts` blueprint and a scene position

## Decision

Aurora Web may construct a new Area sound only when the retained draft
identifies the following immutable source profile:

- profile: `nwn-base-key-uts-animalcriesday-v1`;
- resource: `animalcriesday`, type `2035` (`UTS`);
- GFF identity: `UTS ` / `V3.2`, root struct type `0xffffffff`;
- source SHA-256:
  `a0d185c2813db9cd2649e104715e94c01511f83b97f3319a0ee3c31b8c3357b4`.

The server resolves those bytes from the configured vanilla
`nwn_base.key`/BIF source and recomputes the digest. Draft bytes, host paths,
unverified HAK/module/custom overrides, arbitrary sound ResRefs, and sound
property overrides are not accepted by this profile.

## Immutable evidence

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The sound blueprint-to-instance lineage is explicit in that source:

- `FUN_0063daac` initializes the common sound defaults;
- `FUN_0063db18` reads the common blueprint and instance fields, including
  identity, playback mode, attenuation, timing, priority, volume, and the
  nested sound ResRef list;
- `FUN_0063e398` derives the effective instance priority from effective
  looping and positional state;
- `FUN_0063e414` writes the common instance fields and variables;
- `FUN_0063e77c` constructs the sound object and installs vtable
  `0x00c557b0`;
- `FUN_0063f24c` reads instance-only `GeneratedType`, position,
  `PlayInToolset`, and `Comment`;
- `FUN_0063f57c` writes those instance-only GIT/GIC fields;
- `FUN_0064e0bc` is the UTS blueprint wrapper and additionally reads
  blueprint-only `Comment` and `PaletteID`.

A read-only KEY/BIF extraction on 2026-08-13 used the configured retail
`nwn_base.key`. The exact `animalcriesday` type-2035 payload was 1105 bytes
and had the SHA-256 frozen above. Its root contains:

```text
Tag              = "AnimalCriesDay"
LocName           = localized string, strRef 67786, no embedded entries
TemplateResRef    = "animalcriesday"
Active            = byte(1)
Continuous        = byte(1)
Looping           = byte(0)
Positional        = byte(1)
RandomPosition    = byte(1)
Random            = byte(1)
Elevation         = float32(1.5)
MaxDistance       = float32(10)
MinDistance       = float32(1)
RandomRangeX      = float32(10)
RandomRangeY      = float32(10)
Interval          = dword(25000)
IntervalVrtn      = dword(5000)
PitchVariation    = float32(0.2)
Priority          = byte(18)
Hours             = dword(0)
Times             = byte(3)
Volume            = byte(127)
VolumeVrtn        = byte(0)
Sounds            = ["as_an_cryday1", "as_an_cryday2",
                     "as_an_cryday3", "as_an_cryday4"]
PaletteID         = byte(6)
Comment           = ""
```

The blueprint `Sounds` children have struct type `1243572`. Aurora rewrites
the corresponding GIT children as struct type `0`.

The accepted live Toolset placement proof is retained under
`backend/docs/aurora-reverse/evidence/palette-placement-corrected-live-2026-07-14/`.
It placed and saved `animalcriesday` and changed the sound count from zero to
one.

The packed proof module
`C:/Users/enonw/Documents/Neverwinter Nights/modules/codex_npc_item_live_20260713.mod`
has SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.
Its `demo.git` sound is struct type `6`; its paired `demo.gic` sound is also
struct type `6`. The saved GIT readback matches the blueprint common fields
except that `Priority` is `20`, as required by `FUN_0063e398` for a
non-looping positional sound. It additionally contains `GeneratedType = 0`
and the three position floats. The paired GIC entry contains
`PlayInToolset = 1` and the empty blueprint comment.

No xoreos source or other GPL implementation was used.

## Frozen mapping

The new GIT `SoundList` entry has struct type `6` and exactly the common
profile-derived fields listed above, with these instance rules:

```text
Priority       = byte(20)
Sounds[*]      = struct type 0, field Sound copied from the blueprint ResRef
GeneratedType  = dword(0)
XPosition      = float32(scene.x * 10)
YPosition      = float32(scene.y * 10)
ZPosition      = float32(scene.z * 10)
```

The paired GIC `SoundList` entry has struct type `6` and contains:

```text
PlayInToolset  = byte(1)
Comment        = blueprint Comment
```

`PaletteID` is blueprint/editor metadata and is not written to either
instance entry. The UTS profile has no serialized bearing; therefore the
scene bearing must be exactly zero. Both entries are appended in retained
scene order after surviving source entries. All pre-existing source ordinals
continue to govern deletion and transform planning before additions are
appended.

## Validation and diagnostics

The construction boundary fails closed when source profile, ResRef, digest,
GFF identity, root type, blueprint field type/cardinality, scene identity,
zero-bearing constraint, or finite transform validation differs. It also
rejects duplicate local object IDs, more than 1024 total object additions in
one Area Update, and more than 100000 total scene objects.

Independent readback verifies the nine-family GIT/GIC cardinalities, the exact
new sound fields, nested sound ResRefs, effective priority, paired editor
fields, source/candidate hashes, and additive receipt counts. Diagnostics
contain bounded family counts, object ordinals, profile ID, and hashes; they
never expose source bytes or host filesystem paths.

## Non-admission and exit criteria

This audit does not admit sound property overrides, variables, scripts,
custom sound lists, orientation, HAK/module/custom blueprint precedence, or
construction of any other sound template or object family. Each requires its
own Aurora-first evidence and additive profile.

Unit, integration, round-trip, determinism, atomic-publication, persisted
readback, and regression gates are required. Mutation testing is optional and
requires an explicit user request. Product-level
completion still requires fresh Toolset Save/Build/reopen and NWN runtime
proof for the exact committed candidate.

## Implementation and verification checkpoint

The bounded profile is implemented through the frontend draft factory, scene
projector, immutable base-game blueprint source port and adapter, update
compiler, paired GIT/GIC writer, independent readback verifier, validation
preflight, and atomic publication path. The shared additions budget covers
mixed admitted sound and waypoint construction rather than applying a separate
limit per family. Receipts aggregate exact blueprint provenance in stable
first-seen order.

The production adapter readback is retained at
`evidence/area-sound-construction-2026-08-13/base-uts-production-adapter-readback.json`.
It resolved 1,105 bytes from the installed `nwn_base.key` and reproduced the
frozen digest exactly.

The final bounded automated result is:

- the complete Area Update regression passes 211/211 tests in 14 suites;
- focused frontend profile, factory, and local-draft tests pass 37/37 tests in
  three files;
- backend and frontend production builds pass;
- backend construction mutation scope is 100%: 333 mutants killed, one mutant
  detected by timeout, zero survived, and zero lacked coverage. The report is
  `backend/reports/mutation/area-sound-construction.json`, SHA-256
  `ebd7cceba7964e047c2a549da6548d14ca6b5ae8e9ba83f8509f143d4d1053ec`;
- frontend construction-profile mutation scope is 100%: 16/16 mutants killed,
  zero survived, and zero lacked coverage. The report is
  `frontend/reports/mutation/area-sound-construction.json`, SHA-256
  `382737ce1da62f1dda1a3bf0b84c88e2e4e037b1ff34c7961eaf5bba0d5622a`.

This is offline implementation evidence, not product completion. No fresh
application-candidate Toolset Save/Build/reopen or NWN proof was captured for
this checkpoint.
