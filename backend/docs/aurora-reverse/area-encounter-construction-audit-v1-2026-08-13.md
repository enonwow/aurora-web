# Area encounter construction audit v1

Date: 2026-08-13  
Status: implemented offline from primary-source authority; exact-candidate certification pending  
Scope: create one exact `x2_gnoll001` encounter from immutable retail UTE provenance, a backend-owned four-point local polygon, an empty spawn-point list, and a zero-bearing scene projection

## Decision

Aurora Web may add an encounter only from the exact immutable retail
`x2_gnoll001.UTE` profile described below. The client retains binary-free
provenance plus an origin and bearing `0`. The backend resolves and hashes the
resource, validates every ordered UTE field, and constructs paired type-`7`
`Encounter List` entries.

The GIT entry contains the first 20 ordered UTE fields, excluding only
`PaletteID` and `Comment`, followed by float32 origin, a profile-owned local
`Geometry` list, and an empty `SpawnPointList`. The GIC entry is a type-`7`
struct with no fields. Nonzero bearing, client geometry, spawn points, arbitrary
templates, properties, scripts, creature-list overrides, or source bytes fail
closed.

## Immutable retail UTE

The production `NwnKeyBifResourceReader` read resource type `2040`, ResRef
`x2_gnoll001`, from the installed `nwn_base.key`. The source is 1,072 bytes,
SHA-256
`f3941f1eb580b55247f3ac226e8e0aa72841c3c81ba205c61319b8958a5daeed`,
and parses as `UTE `/`V3.2` with root struct type `0xffffffff`.

Its 22 ordered root fields are:

```text
Tag, LocalizedName, TemplateResRef, Active, Difficulty, DifficultyIndex,
Faction, MaxCreatures, PlayerOnly, RecCreatures, Reset, ResetTime, Respawns,
SpawnOption, OnEntered, OnExit, OnExhausted, OnHeartbeat, OnUserDefined,
CreatureList, PaletteID, Comment
```

Identity is `x2_gnoll001` / `X2_GNOLL001`. `CreatureList` has two type-`0`
entries. Their exact `(Appearance, CR, ResRef, SingleSpawn)` tuples are
`(388, 1, nw_gnoll001, 0)` and `(389, 3, nw_gnoll002, 1)`. The complete typed
readback is retained in
`evidence/area-encounter-construction-2026-08-13/base-ute-production-adapter-readback.json`.

## Aurora decompilation authority

The primary source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The installed Toolset executable is
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
size 12,201,984 bytes, SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.

The recovered lineage is explicit:

- `FUN_0055d444` at lines 215093-215101 dispatches the encounter template
  reader;
- `FUN_0055d470` at lines 215106-215230 reads the identity, localized name,
  encounter controls, scripts, and variables;
- `FUN_0055d8a8` at lines 215235-215376 reads `CreatureList`, including
  `ResRef`, `Appearance`, `CR`, and `SingleSpawn`;
- `FUN_0055dbf8` at lines 215380-215417 writes common encounter fields and
  calls `FUN_0055ddd0`;
- `FUN_0055ddd0` at lines 215421-215447 writes `CreatureList` entries as type
  `0` structs;
- `FUN_0055df48` at lines 215484-215500 constructs the Area encounter instance
  and installs vtable `0x00c15634`;
- `FUN_0055e1f8` at lines 215585-215786 invokes the common template reader,
  reads origin, type-`1` `Geometry`, type-`2` `SpawnPointList`, and the paired
  GIC `Comment` when present;
- `FUN_0055e71c` at lines 215809-215876 invokes the common writer, writes the
  same origin, geometry, spawn-point fields, and optional paired comment;
- `FUN_00569b30` at lines 222134-222211 pairs GIT and GIC `Encounter List`
  ordinals, constructs type-`7` structs, and dispatches reader slot `+0x40`
  and writer slot `+0x3c`.

The independently retained PE binding from the existing encounter transform
audit maps vtable `0x00c15634` slot `+0x3c` to `0x0055e71c` and slot `+0x40`
to `0x0055e1f8`. No xoreos or other GPL source was used.

## Native instance differential

The retained Toolset module is
`codex_npc_item_live_20260713.mod`, size 192,847 bytes, SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.
Its exact `demo.git` and `demo.gic` SHA-256 values are respectively
`a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613`
and `535d1ab4a0c1c22795b867e225437506dd20a905ede1f98e85aa1efcdc61c26d`.

The native type-`7` GIT entry has 25 ordered fields. Fields 1-20 are the exact
UTE fields through `CreatureList`. `PaletteID` and `Comment` are absent. The
remaining fields are `XPosition`, `YPosition`, `ZPosition`, `Geometry`, and
`SpawnPointList`. The native GIC type-`7` entry has no fields.

The accepted local construction geometry is four type-`1` structs:

```text
(-0.13086700439453125, -6.151325225830078,     0.0250005591660738)
( 6.059123992919922,   -6.1513214111328125,    0.025000499561429024)
( 6.059125900268555,    0.038669586181640625,  0.025000059977173805)
( 0,                    0,                     0.02500000037252903)
```

`SpawnPointList` is present and empty. The complete native readback is retained
in
`evidence/area-encounter-construction-2026-08-13/native-toolset-instance-readback.json`.

## Retained live construction proof

Accepted standard `AUR-S01-05` is retained under
`evidence/polygon-placement-live-standard-2026-07-14/`. It selected `Gnoll
Encounter`, drew four points, saved the module, and changed encounters from
zero to one without another family changing in that transaction. The saved GIT
readback proves finite points, nonzero polygon area, implicit closure, ResRef
`x2_gnoll001`, and Tag `X2_GNOLL001`.

Key retained hashes are:

- `README.md`: `1592a823c1057eac3521e6bf05258f68854f97cda268e982405fe6466e0eaab1`;
- `summary.json`: `571afe866cabf0789f1ac04e15a466d1f743227097b61410fceec7a6358f81e8`;
- `validator-result.json`: `53526e1fbf4cf1532a13fc1f5678d251d6a48d244607081852f4ae93d564787d`;
- `01-encounter-action.json`: `548cff5ec65e86d4d3a55211547e1e79839a36cb3b154501fe0e8143d19019b8`;
- `02-encounter-polygon.png`: `bc6c52fb22d65d99c69fa08b4d26d9460888c1ffdf0332a65506deb591e784db`;
- after-encounter `raw.git.summary.json`:
  `372695ad7bf25d2fa0f6ba38e36399d1456d2cef553527f36770b8b38d8f809c`;
- after-encounter `objects.csv`:
  `50a0c6c1c08e18e8ac4f46d1a7b8e5e6f227556034a18805ff9358a57e22284f`.

No Toolset or NWN process was started for this audit; the read-only process
check returned zero `nwtoolset`/`nwmain` processes. The retained live proof is
construction authority, not fresh proof of the application-produced candidate.

## Frozen application mapping

For scene origin `(x, y, z)`, write:

```text
XPosition = float32(x * 10)
YPosition = float32(y * 10)
ZPosition = float32(z * 10)
```

Scene bearing must be exactly `0` because the native encounter has no top-level
orientation field. Geometry is copied from the fixed profile above with type ID
`1` and field labels `X`, `Y`, `Z`. `SpawnPointList` is emitted as an empty
list. GIC is an empty type-`7` struct. List order and same-index GIT/GIC pairing
remain protected by the shared atomic Area Update transaction and independent
candidate readback.

The complexity budget is one exact immutable profile, one discriminated-union
addition member, one mapper, existing source/candidate ports, and focused
backend/frontend tests. No polygon editor, spawn-point authoring, creature-list
editor, properties, scripts, or arbitrary template selection enters this slice.

## Implementation and automated evidence

The bounded profile is implemented through the binary-free frontend factory and
local draft, backend draft projector, immutable blueprint-source port, exact
UTE validator, paired GIT/GIC writer, Area Update candidate compiler, atomic
publication coordinator, and persisted readback verifier. The client cannot
supply blueprint bytes, geometry, spawn points, or a nonzero bearing.

The exact evidence JSON files parse successfully. Their SHA-256 values are:

- base UTE production-adapter readback:
  `51192757607c3ac6f9729d2a0ff43fc505068debe265c4e23dec4d5b79484909`;
- native Toolset instance readback:
  `1b0826e2a08ffdcd07755294d23a1019fccac379fe89dc0b40f4b1c4bd7f5b18`.

Automated implementation evidence is:

- exact source/writer/adapter test: 21/21 passed;
- focused backend source/projector/compiler/shared-writer/adapter regression:
  5 suites, 510 tests passed;
- atomic Area Update publication integration: 1 suite, 19 tests passed;
- focused frontend profile/factory/draft regression: 3 files, 46 tests passed;
- backend and frontend production builds: passed;
- backend focused mutation scope: 247/247 covered mutants killed, 100%, zero
  survivors, uncovered mutants, timeouts, or errors; report
  `backend/reports/mutation/area-encounter-construction.json`, SHA-256
  `6e036d6e337691b523db6c4c4240d0205052938e93ddbe82cf523e760873bff2`;
- frontend focused mutation scope: 34/34 killed, 100%, zero survivors,
  uncovered mutants, timeouts, or errors; report
  `frontend/reports/mutation/area-encounter-construction.json`, SHA-256
  `79cb426a17f615a1b179787bacc8c1f2eb448749889e6c687a183aeb5bbc70cd`.

Product-level completion additionally requires a fresh exact application
candidate through Toolset Save/Build/reopen and NWN. Until that evidence exists,
the slice may be reported only as offline implemented, never fully certified.
