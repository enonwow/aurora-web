# Area door hook construction audit v1

Date: 2026-08-13  
Status: Aurora contract and offline implementation verified; fresh exact-candidate certification pending  
Scope: one bounded `tin01` hook plus `nw_door_ttr_04` construction profile

## Decision

Aurora Web may construct a door only when the draft identifies a verified
tileset hook. Generic point placement and generic door transforms remain
forbidden. The first bounded construction profile admits `tin01` tile `121`,
orientation `0`, height `0`, hook `0`, and vanilla template
`nw_door_ttr_04`. Every other tileset, tile, orientation, hook, template, or
transform fails closed.

## Primary Aurora and retail evidence

The accepted Toolset proof is retained under
`evidence/door-hook-live-standard-2026-07-14/`. It placed Barn Door into the
recognized free hook in Area `Demo - home`, saved the module, and read back one
new native door:

- tileset `tin01`, Area tile row `2`, column `3`, tile ID `121`, orientation
  `0`, height `0`;
- template `nw_door_ttr_04`, tag `Barn1Door`;
- native position `(35, 25.760000228881836, 0)`;
- native bearing `-3.141592264175415`, reported by the Area reader as `180`
  degrees;
- paired type-`8` GIT/GIC entries, with the GIC entry containing only
  `Comment="Barn 1 Door"`.

The retail `tin01.set` resource was read from configured `nwn_base.key` without
using a secondary implementation. Its size is `139772` bytes and SHA-256 is
`e45bfba6f61442e7618b7477f0967943b6ff74a2c02593da6c031c641b3e6ac4`.
The exact relevant records are:

```ini
[TILE121]
Model=tin01_a07_02
WalkMesh=msb01
Doors=1
Orientation=0

[TILE121DOOR0]
Type=0
X=0.00
Y=0.76
Z=0.00
Orientation=180.0
```

The Area instance proves the corresponding orientation-zero translation:
tile column `3` contributes the world center X `35`; row `2` contributes the
world center Y `25`; the local hook Y adds `0.76`. In scene units the exact
hook is `(3.5, 2.576, 0)` with canonical bearing `pi`.

The retail `nw_door_ttr_04.utd` resource is `1803` bytes, SHA-256
`d7fc618b94e0b66c117d5e9d15dea3c0f34f5cc52810b50d146d7c73769406fa`,
and a `UTD `/`V3.2` root struct `0xffffffff`. The saved Toolset instance
preserves its ordered fields through `OnFailToOpen`, replaces blueprint
`GenericType` with instance `GenericType_New`, omits `PaletteID` and `Comment`
from GIT, and appends `X`, `Y`, `Z`, and `Bearing`. GIC retains only the
blueprint comment.

Decompiled Toolset authority is the immutable source
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
`FUN_0056998c` owns paired Door List traversal and struct type `8`;
`FUN_0055b0d4` is the door instance constructor; `FUN_0055c0f8` reads native
position and bearing; and `FUN_0055c35c` writes those fields plus paired GIC
comment. This establishes the persisted mapping, while the accepted live proof
and SET record establish the hook constraint.

No xoreos source or other GPL implementation was used.

## Required enforcement

The implementation must independently validate:

1. immutable UTD and SET identities and exact admitted profiles;
2. the retained Area tileset, tile row/column, tile ID, orientation, and height;
3. the exact derived scene position and canonical bearing;
4. one explicit, versioned hook identity in the draft provenance;
5. absence of a retained or concurrently added door on the same hook;
6. exact type-`8` GIT/GIC field construction and readback;
7. atomic publication with unchanged authorization, idempotency, and recovery.

## Implemented boundary

The offline candidate now enforces the bounded contract end to end:

- the SET parser exposes exact indexed door-hook records and rejects missing,
  negative, fractional, or malformed hook declarations with diagnostics;
- the production base-key adapter resolves and SHA-256-binds both the admitted
  UTD and `tin01.set` dependency;
- draft projection admits Door provenance only for the exact retained
  tileset/tile/orientation/height/hook tuple, derives the scene transform, and
  rejects unknown fields, stale fingerprints, invalid grid coordinates, and
  occupied hooks;
- the paired writer validates the immutable UTD profile and creates the exact
  type-`8` GIT/GIC entries, including native float32 coordinates, native
  bearing, ordered field projection, and GIC comment;
- the update compiler resolves each immutable dependency once and includes it
  in the deterministic receipt before atomic publication;
- the frontend exposes a dedicated `createDoorAtHook` port/facade path for
  pointer and drag/drop placement. It does not apply generic grid snapping or
  accept catalog identity overrides. Generic Door move, visual transform,
  copy, paste, and duplicate remain blocked.

The final offline gates are recorded under
`evidence/area-door-hook-construction-2026-08-13/`:

- backend focused/integration gate: 5 suites and 262 tests passed;
- frontend focused gate: 7 files and 95 tests passed;
- backend and frontend production builds passed;
- backend mutation gate: 310/310 active mutants killed, zero survived,
  timed out, or lacked coverage;
- frontend mutation gate: 265/265 active mutants killed, zero survived,
  timed out, or lacked coverage.

The mutation configurations exclude only mutation classes documented as
equivalent for this immutable zero-offset profile or non-behavioral literals;
the reports retain all ignored counts and exact hashes.

## Browser verification attempt

A fresh headed Playwright session authenticated as a builder, entered
Areas/Add Objects, and confirmed that the Doors family is present. The
host-local memory runtime contained no production Area or object catalog, so
the Doors family had zero templates and the active scene remained the blocked
seed placeholder. The screenshot and exact blocker are recorded in
`evidence/area-door-hook-construction-2026-08-13/browser-proof-blocker.json`.

This is intentionally not accepted as visual or runtime proof: it lacks the
exact `tin01` tile/hook state and does not satisfy the zero unexpected
failed/bridge tile requirement.

## Completion boundary

The implemented candidate is offline-verified, not product-certified.
Certification additionally requires a fresh exact-candidate browser capture
with the exact production data and settled tile contracts, followed by Toolset
Save/Build/reopen readback and NWN runtime proof under the proof-capture safety
contract.
