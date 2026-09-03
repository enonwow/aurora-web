# Area Advanced dialog dormant controls audit v1

Date: 2026-08-24  
Status: Frozen offline implementation authority; browser and native release proof remain pending

## Decision

Aurora Web must not expose Area mutations for the legacy `World Map Icon`,
`World Map X`, `World Map Y`, or `Time` controls embedded in the current retail
`TdlgAreaProperties` form. The controls exist in the dialog resource, but the
current Area edit route does not bind them to Area state and the native Area
reader/writer does not persist corresponding ARE fields.

These controls are dormant dialog surface, not missing Area CRUD. The supported
Advanced authoring matrix is therefore complete offline when it includes the
already audited terrain flags, PvP mode, no-rest flag, Listen/Spot modifiers,
loading-screen ID/effective selector, and Area variable table. Aurora Web must
not invent storage, derive a substitute from render time, or add an
application-only field under the native Area-properties contract.

## Immutable evidence

The admitted primary reverse artifacts are:

| Artifact | SHA-256 |
| --- | --- |
| `C:\Projects\New Folder\export\decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:\Projects\New Folder\export\functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| `C:\Projects\New Folder\export\strings.tsv` | `864ae0139451d5333307cb2bbccce725bbd2d2c6056ac2d5f80f9b5ea50f190f` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| existing read-only `TdlgAreaProperties` VCL map | `6a95921d6b57f08433c15aa36c05d8a9d0b2c876bb11da3b98a292bba08ad0ed` |

The VCL map is
`backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-06-area-resize/area-properties-vcl-map.json`.
It records the exact retail dialog class and fields `eWorldMapIcon`,
`bWorldMapIcon`, `eWorldX`, `udWorldX`, `eWorldY`, `udWorldY`, `eTime`, and
`udTime`. Its method table binds `bWorldMapIconClick` to `0x0054c960`,
`OnTimeExit` to `0x0054df70`, and `OnWorldMapXYExit` to `0x0054df80`.

No xoreos source, code, names, or runtime conclusions were used.

## Dialog behavior is not Area persistence

`FUN_0054c960` at `decompiled_all.c:205784-205884` implements only the browse
interaction for the World Map Icon edit. After a file selection it copies the
selected basename into the `eWorldMapIcon` control at line 205872. The handler
does not assign an Area member or invoke a GFF writer.

The form also retains exit validators for the time and coordinate edits. Their
presence establishes that the legacy controls were designed as inputs, but it
does not establish a current persistence contract. The authoritative edit
route is the complete state transfer around the modal dialog:

- `FUN_00553710`, `decompiled_all.c:209591-209809`, copies the native Area and
  GIT AreaProperties state into the dialog state;
- `FUN_0055404c`, lines 209840-209957, copies admitted dialog state back into
  the Area and GIT AreaProperties state;
- the caller at lines 233176-233235 then writes the ARE with `FUN_005a9f30`
  and the GIT with `FUN_005685fc`.

The transfer includes identity, comments, visual environment, audio,
event-script ResRefs, weather, loading-screen ID, PvP, no-rest, terrain flags,
and the GIT AreaProperties audio tuple. It contains no World Map Icon, World X,
World Y, or Time transfer. There is no companion publication call for a world
map or time resource in this route.

## Native ARE reader/writer closure

`FUN_005a7fc8` is the native ARE reader. The contiguous root-field block at
`decompiled_all.c:255183-255258` reads the terrain `Flags`, weather values,
Listen/Spot modifiers, complete visual-environment fields, `LoadScreenID`,
`PlayerVsPlayer`, `NoRest`, dimensions, event scripts, and tile-border state.
It requests no World Map Icon, World X, World Y, or Time field.

`FUN_005a9f30` is the matching native ARE writer. The contiguous root-field
block at lines 255850-255933 writes identity, comments, expansions, terrain,
Listen/Spot modifiers, the complete visual environment, weather,
`LoadScreenID`, `PlayerVsPlayer`, `NoRest`, dimensions, event scripts,
tile-border state, and tileset identity. It emits no World Map Icon, World X,
World Y, or Time field.

Reader, modal state transfer, writer, and caller publication therefore agree:
the dormant controls have no current Area resource storage contract.

## Product and preservation contract

Aurora Web keeps the four dormant controls absent from its mutation schema and
UI. A retained source containing unknown extension fields is preserved by the
existing lossless update transaction; this audit does not authorize deleting,
normalizing, or repurposing such fields. Renderer `auroraWorldTimer` state is a
separate runtime/render contract and must never be projected into an Area
property named `Time`.

Adding one of these controls in the future requires new primary evidence that
identifies an actual persisted resource, exact labels/types, load and save
call chains, bounds, conflict behavior, and Toolset/NWN differential proof.

## Completion boundary

This audit closes the former offline
`unverified_advanced_controls_preserve_only` blocker. It does not certify the
Aurora Web browser UI, exact-candidate Toolset Save/Build/reopen, or NWN
behavior for the supported Advanced fields. Those remain explicit release
blockers and must not be inferred from this negative storage result.
