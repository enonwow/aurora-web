# Area trigger construction audit v1

Date: 2026-08-13  
Status: `implemented_offline_primary_source_bound`; fresh application-candidate
Toolset Save/Build/reopen and NWN runtime certification remain `missing`

## Scope

This audit freezes the first bounded native `Trigger Create` profile for Area
Update. It admits only the installed `newgeneric.UTT` blueprint, zero bearing,
and the exact four-point local polygon retained from accepted Toolset standard
`AUR-S01-08`. It does not admit arbitrary trigger templates, client-supplied
geometry, polygon editing, rotation, properties, scripts, links, variables, or
runtime activation authoring.

## Primary Aurora authority

The exact installed base-game resource was independently reread through the
production base-key source path:

- profile: `nwn-base-key-utt-newgeneric-v1`;
- resource type: `2032`;
- file identity: `UTT `/`V3.2`, root struct `0xffffffff`;
- ResRef and Tag: `newgeneric` and `GenericTrigger`;
- size: 1,025 bytes;
- ordered root fields: 28;
- SHA-256:
  `e855ae85a9b8511aca84ada06b9779126ff615f9bd816df4dbf39e1a1544001c`.

The exact production-adapter readback is retained at
`evidence/area-trigger-construction-2026-08-13/base-utt-production-adapter-readback.json`.
The test-first run initially exposed a one-character drift in a compressed test
fixture: the inflated bytes still had the expected size but produced SHA-256
`f2135d79f21eba8ed024a184a7d3e1dc5202f40e392f691f474f1d24d0df96cd`
and field label `SmriptOnEnter`. The fixture was rejected, the resource was
reread from `nwn_base.key`, and the final fixture now reproduces the admitted
digest and exact `ScriptOnEnter` label. The expected hash was not weakened.

## Decompilation mapping

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The inspected Toolset executable is
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.

The exact mapping is established by the following native functions:

- `FUN_00656720` reads the common trigger template/instance fields, including
  localized name, key/link fields, type, trap flags/DCs and script slots. In
  template mode it reads `Portrait` ResRef and resolves the numeric portrait
  ID; instance defaults include `LoadScreenID=0`, `PortraitId=0`, and
  `TrapDetectable=1` for this source profile;
- `FUN_0065752c` writes the common trigger instance fields in the observed
  native order;
- `FUN_00657a88` reads origin, three orientation floats, paired GIC comment,
  and every type-`3` `Geometry` point with `PointX`/`PointY`/`PointZ`;
- `FUN_00657de0` writes the same instance position/orientation, paired comment,
  and type-`3` polygon geometry;
- `FUN_006577b8` installs trigger vtable `0x00c5c76c`; PE inspection binds
  writer slot `+0x3c` to `0x00657de0` and reader slot `+0x40` to
  `0x00657a88`.

No xoreos or other GPL implementation was used.

## Native Toolset authority

Accepted live proof
`evidence/polygon-placement-live-standard-2026-07-14/` selected `New Generic`,
placed exactly one `newgeneric` trigger, changed triggers from zero to one and
total objects from 17 to 18, saved, parsed four finite polygon points with
nonzero area, and restored native `Objects` mode. The session used no global
input and closed cleanly with zero Toolset processes.

The retained module is `codex_npc_item_live_20260713.mod`, 192,847 bytes,
SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.
Area `demo` contains one type-`1` trigger at `TriggerList[0]`. Its GIT SHA-256
is `a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613`;
its paired GIC SHA-256 is
`535d1ab4a0c1c22795b867e225437506dd20a905ede1f98e85aa1efcdc61c26d`.
The exact field, transform, polygon and companion readback is retained at
`evidence/area-trigger-construction-2026-08-13/native-toolset-instance-readback.json`.

No new Toolset or NWN session was started for this offline implementation
checkpoint. The retained live proof establishes the native placement lineage;
it does not replace the still-required fresh proof of application-produced
candidate bytes.

## Frozen UTT-to-instance mapping

The admitted mapping is exact and fail-closed:

1. Validate the source digest, GFF identity, 28-field count, order, types and
   values.
2. Validate exact profile, template, ResRef and Tag provenance.
3. Reject every nonzero scene bearing.
4. Emit one type-`1` GIT structure and one same-index type-`1` GIC companion.
5. Write `XPosition`, `YPosition` and `ZPosition` as float32 `scene * 10`.
6. Write all three orientation floats as zero; never synthesize `Bearing`.
7. Preserve the admitted common trigger fields and apply the native instance
   defaults/conversions `LoadScreenID=0`, `PortraitId=0`, and
   `TrapDetectable=1`.
8. Omit blueprint-only `PaletteID`, `Portrait`, `PartyRequired`, and root
   `Comment` from the GIT instance.
9. Append the immutable profile-owned four-point type-`3` local `Geometry`
   list. No geometry bytes or vertices cross the frontend/backend contract.
10. Emit GIC with only empty `Comment`.
11. Independently parse the serialized candidate and compare the exact appended
    GIT/GIC structures, family counts and hashes before publication succeeds.

## Implementation

- Backend profile:
  `src/modules/areas/domain/area-trigger-construction-profile.ts`.
- The source port and production base-key adapter resolve the exact immutable
  UTT using resource type `2032`.
- Draft projection admits only `triggers` + `trigger` with the exact
  binary-free provenance tuple and zero bearing.
- The paired writer constructs and readback-verifies the 34-field type-`1`
  GIT entry and one-field type-`1` GIC entry while preserving unrelated
  families.
- The shared compiler and transaction coordinator publish ARE/GIT/GIC/IFO
  through the existing immutable successor and independently verified readback
  boundary.
- The frontend factory and local draft adapter retain only the immutable source
  identity plus origin; geometry remains backend-owned.
- The additive FE-BE v1 contract records this exact slice without widening the
  public binary or payload budgets.

## Automated verification checkpoint

- Focused backend unit regression: 5 suites, 507 tests passed.
- Atomic Area Update publication integration: 1 suite, 18 tests passed.
- Focused frontend profile/factory/draft regression: 3 files, 44 tests passed.
- Backend production build: passed.
- Frontend production build (`tsc -b && vite build`): passed.
- Backend Trigger-construction mutation scope: 228/228 killed, 100%, zero
  survived, timed out, uncovered, or errored. Report SHA-256:
  `454e850d3a2ddf9016187e670701fe9cfd28a731b166d989f65316223afae311`.
- Frontend Trigger-profile mutation scope: 31/31 killed, 100%, zero survived,
  timed out, uncovered, or errored. Report SHA-256:
  `b8b0519bf3e8ddfdfac48919c45ea49d49f9af899e3520e76f8047ec2ddf4ee3`.
- The production reader independently re-read the exact installed 1,025-byte
  UTT and recomputed the pinned digest.

## Remaining boundary

This checkpoint does not complete Trigger authoring or the Areas product. A
fresh exact application-produced candidate still requires Toolset
Save/Build/reopen and NWN runtime certification under the proof safety
contract. Arbitrary templates, polygon editing, properties, scripts, links,
variables and runtime activation remain separate Aurora-first slices. Two
native Create families remain before all nine Area object families have a
bounded construction profile; the broader backlog also retains full property
authoring, Area CRUD closure, tile eligibility/rendering/joining,
`PathConnect`/WOK, the 99-tileset matrix, and final release certification.
