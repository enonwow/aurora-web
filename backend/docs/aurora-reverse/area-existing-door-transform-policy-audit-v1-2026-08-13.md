# Existing Area door transform policy audit v1

Date: 2026-08-13  
Status: verified non-admission for generic movement; hook placement remains a
separate implementation capability  
Scope: retained `Door List` instances in Area Update

## Decision

Aurora Web must not materialize a generic position or bearing change for an
existing door. A retained door may remain byte-exact or may be deleted through
the already admitted paired GIT/GIC transaction, but any scene position or
bearing delta fails with `AREA_UPDATE_OBJECT_MUTATION_INVALID`.

This is a family policy, not an absent float serializer. Aurora persists door
`X`, `Y`, `Z`, and `Bearing`, but accepted native evidence shows that valid
door placement is constrained to a tileset door hook. It also shows that
arbitrary viewport points and a visible tile seam are not hooks. Writing the
four floats without first proving the target hook and compatible template
would therefore manufacture a native-invalid placement semantic.

The eventual door-authoring command must be hook-specific. It requires an
immutable tileset/profile, exact tile and orientation, a verified hook
identity and transform, compatible door-template identity, target occupancy,
and independent Toolset Save/Build/readback plus NWN proof. It is not an
extension of the generic object transform union.

## Immutable Aurora evidence

### Decompiled Toolset source

Primary source:

- `C:/Projects/New Folder/export/decompiled_all.c`;
- SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

`FUN_0056998c` at lines `222055-222131` owns paired `Door List` traversal,
constructs the door instance through `FUN_0055b0d4`, and allocates GIT/GIC
struct type `8`. The constructor installs vtable `0x00c14ae8`.

Read-only PE inspection of
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`
records:

- SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- size `12,201,984` bytes;
- image base `0x00400000`;
- vtable `0x00c14ae8`, file offset `0x00813ae8`;
- writer slot `+0x3c` -> `FUN_0055c35c`;
- reader slot `+0x40` -> `FUN_0055c0f8`.

The reader at lines `214244-214349` reads the three position floats and
`Bearing`; the writer at lines `214351-214373` writes the same four values and
the paired GIC `Comment`. This establishes the persistence fields and paired
lineage. It does not establish that every four-float tuple is a valid door
placement.

No xoreos source or other GPL implementation was used.

### Accepted live hook proof

The retained accepted proof is under
`backend/docs/aurora-reverse/evidence/door-hook-live-standard-2026-07-14/`.
Its controlled fixture removed one native door from a recognized hook, then
placed `Barn Door` back into that exact hook. Save readback changed doors
`0 -> 1` and total objects `1 -> 2`, preserving all other family counts. The
new entry was `nw_door_ttr_04`, tag `Barn1Door`, position
`(35, 25.76, 0)`, and bearing `180` degrees.

Key artifact hashes are:

- `README.md`:
  `8237532842af2c8aae4121516284fb108152074d7f1fa68ee76824bd175e87d7`;
- `13-home-barn-door-hook-action.json`:
  `92d01d7010d0bdc791b439c902839aee16a5e4018a19e5e57df153cf8ef1da27`;
- `15-home-barn-door-added-saved.png`:
  `802b8f82a2fb2b059b34e109acc15ba9e796c3c5e27960c47c95c199b5384d51`;
- added `raw.git.summary.json`:
  `686a5b6a69f2910b9e0e9aea3d0d690b99cfe6a6760a6ba5957acd2347828a38`;
- `validator-result.json`:
  `b521a12dd6635a0f91bd603f1f1d11dd6ee4fba88e04cea742c80c1559c57a94`;
- `session-close.json`:
  `de0c32c90d0e4432fa994d8974054b0db6cb36f655444272bacce640b440b2d9`.

Four earlier clicks in unrelated points, including a tile seam, produced no
dirty title and no door record. A separate `Area Transition (No Visible Door)`
attempt kept doors and total counts unchanged and retained the exact object
summary hash. These negative observations prove that point placement cannot be
used as a hook oracle.

## Enforced application boundary

The frontend hides generic Adjust Location for doors and blocks door movement
through keyboard, context-menu, gizmo, and mutation-facade paths. The backend
planner independently rejects any retained door position or bearing delta;
there is no `door` member in `ExistingAreaObjectTransform`, so a caller cannot
bypass the UI and serialize an unverified target.

Focused enforcement gates pass: the backend planner suite is `28/28`, and the
frontend scene-mutation-facade suite is `43/43`, including translation, height,
bearing, and absolute-location door guards. The broader existing frontend
workspace smoke fixtures are not a green exit gate: the current dirty
worktree run passed `12/44` and failed `32/44` because its scene-object fixture
loaded zero objects (`door_west_01` and `plc_barrel_01` were absent). That
known fixture drift is independent of this documentation/policy slice and
remains explicit regression debt.

This closes the bounded existing-object transform matrix as eight admitted
family transforms plus one verified door non-admission. It does not complete
door CRUD. Hook enumeration/resolution, hook-specific construction or
replacement, transition editing, occupancy diagnostics, undo/redo, packed
readback, and NWN traversal remain required separate slices.

## Exit criteria for future hook authoring

Before door creation or relocation is admitted, tests and proof must establish:

1. deterministic hook identities from the exact tileset, tile, orientation,
   and selected resource lineage;
2. exact hook world position and bearing mapping;
3. template-to-hook compatibility and occupied-hook rejection;
4. paired GIT/GIC construction defaults and transition-field preservation;
5. atomic ARE/GIT/GIC/IFO publication and independent readback;
6. fresh Toolset Save/Build/reopen and exact NWN transition/runtime proof.
